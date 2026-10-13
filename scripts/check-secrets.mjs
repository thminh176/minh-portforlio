import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const targetDir = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
console.log(`[check:secrets] Running secret and tracked file safety audit on: ${targetDir}`);

// Maximum text file size inspected (2MB explicit limit)
const MAX_TEXT_SCAN_BYTES = 2 * 1024 * 1024;

let rawOutput;
try {
  // Use execFileSync with -z (NUL delimiter) to safely handle spaces, special characters, and Unicode
  rawOutput = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], {
    cwd: targetDir,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
  });
} catch (err) {
  // Fail-closed on Git enumeration or invocation errors
  console.error('[check:secrets] FAIL (fail-closed): Git enumeration failed or directory is not a Git repository:', err.message);
  process.exit(1);
}

// Split on NUL byte
const files = rawOutput.split('\0').filter(Boolean);

const SECRET_PATTERNS = [
  { name: 'Private Key Header', regex: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----/ },
  { name: 'GitHub Token', regex: /gh[pousr]_[A-Za-z0-9_]{36,}/ },
  { name: 'GitHub Fine-grained PAT', regex: /github_pat_[A-Za-z0-9_]{82}/ },
  { name: 'JWT Token Structure', regex: /eyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{15,}/ },
  { name: 'Cloudflare Token Assignment', regex: /CLOUDFLARE_API_TOKEN\s*[:=]\s*['"]?[a-zA-Z0-9_-]{35,}['"]?/i },
  { name: 'Generic Secret Assignment', regex: /(?:api[_-]?key|secret[_-]?token|auth[_-]?token)\s*[:=]\s*['"]?[a-zA-Z0-9_\-]{24,}['"]?/i },
];

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar', '.gz',
  '.pdf', '.exe', '.dll', '.pyc',
]);

let violations = 0;
let auditedCount = 0;

for (const relFile of files) {
  // Narrow exclusions: pinned local vendor skill and isolated local test fixtures
  if (relFile.startsWith('.agents/skills/ui-ux-pro-max/') || relFile.startsWith('reports/local/')) {
    continue;
  }

  const base = path.basename(relFile);

  // Narrow lockfile exclusion (do not scan machine-generated package hashes, but scan all other YAML/configs)
  if (base === 'pnpm-lock.yaml' || base === 'package-lock.json' || base === 'yarn.lock') {
    continue;
  }

  // 1. Filename safety checks (inspect basename across all nested folders)
  if (base === '.env' || (base.startsWith('.env.') && base !== '.env.example')) {
    console.error(`[check:secrets] FAIL: Sensitive environment file detected: ${relFile}`);
    violations++;
    continue;
  }

  if (base === '.dev.vars' || base.startsWith('.dev.vars.')) {
    console.error(`[check:secrets] FAIL: Sensitive Cloudflare dev vars file detected: ${relFile}`);
    violations++;
    continue;
  }

  if (/\.(pem|key|p12|pfx)$/i.test(base) || /^id_(rsa|ed25519|ecdsa|dsa)/i.test(base)) {
    console.error(`[check:secrets] FAIL: Sensitive private key file detected: ${relFile}`);
    violations++;
    continue;
  }

  if (base === 'debug.log') {
    console.error(`[check:secrets] FAIL: Debug log file detected: ${relFile}`);
    violations++;
    continue;
  }

  // 2. Content safety checks for readable text files (including .github/workflows/*.yaml)
  const fullPath = path.resolve(targetDir, relFile);
  const ext = path.extname(relFile).toLowerCase();

  if (BINARY_EXTENSIONS.has(ext)) {
    auditedCount++;
    continue;
  }

  let stats;
  try {
    stats = fs.statSync(fullPath);
  } catch (err) {
    if (err.code === 'ENOENT') {
      // File removed since git ls-files, skip safely
      continue;
    }
    console.error(`[check:secrets] FAIL (fail-closed): Stat error on ${relFile}:`, err.message);
    violations++;
    continue;
  }

  if (!stats.isFile()) {
    continue;
  }

  if (stats.size > MAX_TEXT_SCAN_BYTES) {
    console.warn(`[check:secrets] NOTICE: File ${relFile} (${stats.size} bytes) exceeds text limit; scanning first ${MAX_TEXT_SCAN_BYTES} bytes.`);
  }

  try {
    // Read up to MAX_TEXT_SCAN_BYTES
    const bytesToRead = Math.min(stats.size, MAX_TEXT_SCAN_BYTES);
    const buffer = Buffer.alloc(bytesToRead);
    const fd = fs.openSync(fullPath, 'r');
    fs.readSync(fd, buffer, 0, bytesToRead, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8');

    for (const pattern of SECRET_PATTERNS) {
      if (pattern.regex.test(content)) {
        // Redact match: report rule name and file path, never output secret contents
        console.error(`[check:secrets] FAIL: Secret signature detected in ${relFile} [REDACTED_MATCH] (rule: ${pattern.name})`);
        violations++;
      }
    }
  } catch (err) {
    console.error(`[check:secrets] FAIL (fail-closed): Read error on ${relFile}:`, err.message);
    violations++;
    continue;
  }

  auditedCount++;
}

if (violations > 0) {
  console.error(`[check:secrets] FAILED: Detected ${violations} security/secret violation(s).`);
  process.exit(1);
}

console.log(`[check:secrets] PASS: ${auditedCount} files audited successfully.`);
console.log('[check:secrets] NOTE: This audit performs heuristic signature and filename verification up to 2MB per text file; it does not constitute a mathematical zero-secret guarantee.');
process.exit(0);
