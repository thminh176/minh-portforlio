import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

export const DEFAULT_MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};

/**
 * Portable browser executable discovery.
 * Checks environment variables, followed by platform-specific system browser locations.
 * Never attempts to download browsers.
 */
export function locateBrowserExecutable() {
  const envCandidates = [
    process.env.PLAYWRIGHT_CHROME_PATH,
    process.env.CHROME_PATH,
    process.env.BROWSER_PATH,
    process.env.EDGE_PATH,
  ].filter(Boolean);

  for (const candidate of envCandidates) {
    if (fs.existsSync(candidate)) {
      return { executablePath: candidate, source: 'environment' };
    }
  }

  const windowsCandidates = [
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  const linuxCandidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge',
    '/snap/bin/chromium',
  ];

  const macCandidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  ];

  let systemCandidates = [];
  if (process.platform === 'win32') {
    systemCandidates = windowsCandidates;
  } else if (process.platform === 'darwin') {
    systemCandidates = macCandidates;
  } else {
    systemCandidates = linuxCandidates;
  }

  for (const candidate of systemCandidates) {
    if (fs.existsSync(candidate)) {
      return { executablePath: candidate, source: 'system' };
    }
  }

  return null;
}

/**
 * Creates an in-process HTTP static server bounded strictly inside rootDir using path.relative.
 * Tracks active sockets and provides closeBounded() with timeout and connection destruction.
 */
export async function createStrictStaticServer({ rootDir, port = 0, mimeTypes = DEFAULT_MIME_TYPES, compression = false }) {
  const resolvedRoot = path.resolve(rootDir);
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    try {
      const parsedUrl = new URL(req.url, 'http://127.0.0.1');
      let pathname = decodeURIComponent(parsedUrl.pathname);

      if (pathname.endsWith('/')) {
        pathname += 'index.html';
      }

      const relativePart = pathname.replace(/^[/\\]+/, '');
      const filePath = path.resolve(resolvedRoot, relativePart);

      // Strict path.relative containment check:
      // rel must not be empty, must not start with '..', and must not be absolute
      const rel = path.relative(resolvedRoot, filePath);
      if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden: Path traversal outside root');
        return;
      }

      let targetPath = filePath;
      if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
        targetPath = path.join(targetPath, 'index.html');
      }

      if (!fs.existsSync(targetPath)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }

      const ext = path.extname(targetPath).toLowerCase();
      const contentType = mimeTypes[ext] || 'application/octet-stream';
      const content = fs.readFileSync(targetPath);

      const acceptsGzip = (req.headers['accept-encoding'] ?? '').split(',').some((entry) => {
        const [encoding, quality] = entry.trim().split(';');
        return encoding === 'gzip' && (!quality || Number(quality.trim().replace('q=', '')) > 0);
      });
      const compressible = /^(text\/|application\/(javascript|json|xml)|image\/svg)/.test(contentType);
      const useGzip = compression && acceptsGzip && compressible && content.length >= 48;
      res.writeHead(200, { 'Content-Type': contentType, ...(compression ? { Vary: 'Accept-Encoding' } : {}), ...(useGzip ? { 'Content-Encoding': 'gzip' } : {}) });
      res.end(useGzip ? gzipSync(content) : content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`500 Server Error: ${err.message}`);
    }
  });

  server.on('connection', (socket) => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });

  const assignedPort = server.address().port;
  const baseUrl = `http://127.0.0.1:${assignedPort}`;

  async function closeBounded(timeoutMs = 5000) {
    // Terminate any remaining active keep-alive or in-flight sockets
    for (const socket of sockets) {
      socket.destroy();
    }
    sockets.clear();

    return new Promise((resolve, reject) => {
      let timer = setTimeout(() => {
        reject(new Error(`Static server close timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      server.close((err) => {
        clearTimeout(timer);
        if (err) reject(err);
        else resolve();
      });
    });
  }

  return {
    server,
    port: assignedPort,
    baseUrl,
    closeBounded,
  };
}

/**
 * Dispose explicitly owned contexts before closing their browser process.
 * Keep this separate so existing closeBrowserBounded callers retain their
 * timeout contract and browser closure can still be attempted after failure.
 */
export async function closeBrowserContextsBounded(browser, timeoutMs = 5000) {
  if (!browser) return;

  let timer = null;
  try {
    await Promise.race([
      Promise.all(browser.contexts().map((context) => context.close())),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Browser contexts close timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Bounded browser closure with explicit timeout and cleared timers.
 */
export async function closeBrowserBounded(browser, timeoutMs = 5000) {
  if (!browser) return;

  let timer = null;
  try {
    await Promise.race([
      browser.close(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`Browser close timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
