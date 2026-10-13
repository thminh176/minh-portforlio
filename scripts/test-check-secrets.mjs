import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

console.log('[test:secrets] Starting integration self-check for secret scanner...');

const checkerScript = path.resolve('scripts/check-secrets.mjs');
const baseTempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-scanner-test-'));

function createGitRepo(dir) {
  fs.mkdirSync(dir, { recursive: true });
  execFileSync('git', ['init'], { cwd: dir, stdio: 'ignore' });
}

function runChecker(targetDir) {
  const res = spawnSync(process.execPath, [checkerScript, targetDir], {
    encoding: 'utf8',
  });
  return {
    exitCode: res.status,
    stdout: res.stdout || '',
    stderr: res.stderr || '',
  };
}

let allPassed = true;
const results = [];

try {
  // Test 1: Clean Git repository (including filenames with spaces & Unicode)
  {
    const cleanDir = path.join(baseTempDir, 'clean-repo');
    createGitRepo(cleanDir);
    fs.writeFileSync(path.join(cleanDir, 'README.md'), '# Clean Project\n');
    fs.writeFileSync(path.join(cleanDir, '.env.example'), 'PUBLIC_VAR=clean\n');
    fs.mkdirSync(path.join(cleanDir, 'src/thư mục tài liệu'), { recursive: true });
    fs.writeFileSync(path.join(cleanDir, 'src/thư mục tài liệu/bản sao có dấu và khoảng trắng.txt'), 'Nội dung an toàn.\n');

    const res = runChecker(cleanDir);
    const pass = res.exitCode === 0 && res.stdout.includes('PASS');
    results.push({ name: '1. Clean Git fixture (with spaces and Unicode paths)', pass, exitCode: res.exitCode });
    if (!pass) {
      allPassed = false;
      console.error('[test:secrets] Test 1 failed:', res);
    }
  }

  // Test 2: Nested sensitive environment file
  {
    const nestedEnvDir = path.join(baseTempDir, 'nested-env-repo');
    createGitRepo(nestedEnvDir);
    fs.mkdirSync(path.join(nestedEnvDir, 'nested/sublevel'), { recursive: true });
    fs.writeFileSync(path.join(nestedEnvDir, 'nested/sublevel/.env.production'), 'SECRET=should-fail\n');

    const res = runChecker(nestedEnvDir);
    const pass = res.exitCode === 1 && res.stderr.includes('nested/sublevel/.env.production');
    results.push({ name: '2. Nested sensitive environment file failure', pass, exitCode: res.exitCode });
    if (!pass) {
      allPassed = false;
      console.error('[test:secrets] Test 2 failed:', res);
    }
  }

  // Test 3: Synthetic token in workflow YAML
  {
    const yamlTokenDir = path.join(baseTempDir, 'yaml-token-repo');
    createGitRepo(yamlTokenDir);
    fs.mkdirSync(path.join(yamlTokenDir, '.github/workflows'), { recursive: true });
    const syntheticToken = ['ghp_', 'A'.repeat(36)].join('');
    fs.writeFileSync(
      path.join(yamlTokenDir, '.github/workflows/deploy.yaml'),
      `name: Test\ntoken: ${syntheticToken}\n`
    );

    const res = runChecker(yamlTokenDir);
    const pass = res.exitCode === 1 && res.stderr.includes('.github/workflows/deploy.yaml');
    results.push({ name: '3. Synthetic token in workflow YAML failure', pass, exitCode: res.exitCode });
    if (!pass) {
      allPassed = false;
      console.error('[test:secrets] Test 3 failed:', res);
    }
  }

  // Test 4: Unavailable Git repository (fail-closed on non-git directory)
  {
    const nonGitDir = path.join(baseTempDir, 'non-git-dir');
    fs.mkdirSync(nonGitDir, { recursive: true });
    fs.writeFileSync(path.join(nonGitDir, 'clean-file.txt'), 'Not a git repo.\n');

    const res = runChecker(nonGitDir);
    const pass = res.exitCode === 1 && res.stderr.includes('fail-closed');
    results.push({ name: '4. Non-git directory fails closed', pass, exitCode: res.exitCode });
    if (!pass) {
      allPassed = false;
      console.error('[test:secrets] Test 4 failed:', res);
    }
  }

  // Test 5: SVG text file content scan (verifies SVGs are scanned as text, not skipped as binary)
  {
    const svgDir = path.join(baseTempDir, 'svg-repo');
    createGitRepo(svgDir);
    const syntheticToken = ['ghp_', 'B'.repeat(36)].join('');
    fs.writeFileSync(
      path.join(svgDir, 'icon.svg'),
      `<svg xmlns="http://www.w3.org/2000/svg"><!-- ${syntheticToken} --><rect width="10" height="10"/></svg>\n`
    );

    const res = runChecker(svgDir);
    const pass = res.exitCode === 1 && res.stderr.includes('icon.svg');
    results.push({ name: '5. SVG text file with token fails (proves SVG is actively scanned)', pass, exitCode: res.exitCode });
    if (!pass) {
      allPassed = false;
      console.error('[test:secrets] Test 5 failed:', res);
    }
  }

} finally {
  // Clean up test directories
  try {
    fs.rmSync(baseTempDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors on Windows locks
  }
}

console.log('\n[test:secrets] Integration self-check results:');
for (const r of results) {
  console.log(`  [${r.pass ? 'PASS' : 'FAIL'}] ${r.name} (exit: ${r.exitCode})`);
}

if (!allPassed) {
  console.error('[test:secrets] One or more integration tests failed.');
  process.exit(1);
}

console.log('[test:secrets] All integration tests passed successfully.');
console.log('[test:secrets] Heuristic coverage note: verified fail-closed Git execution, space/Unicode preservation, nested basename inspection, workflow YAML token detection, and SVG text scanning.');
console.log('[test:secrets] Exact exclusions: .agents/skills/ui-ux-pro-max/, reports/local/, and lockfiles (pnpm-lock.yaml, package-lock.json, yarn.lock).');
console.log('[test:secrets] Text inspection boundary: 2MB limit per file.\n');
process.exit(0);
