import fs from 'node:fs';
import path from 'node:path';

// Next Windows export bug: https://github.com/vercel/next.js/issues/92339
// Preserve originals; copy only nested segment text to the expected flat names.
const root = path.resolve('out');
let count = 0;
function visit(directory, segmentRoot = null, pieces = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const source = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (segmentRoot) visit(source, segmentRoot, [...pieces, entry.name]);
      else if (entry.name.startsWith('__next.')) visit(source, directory, [entry.name]);
      else visit(source);
    } else if (segmentRoot && entry.isFile() && entry.name.endsWith('.txt')) {
      const destination = path.join(segmentRoot, [...pieces, entry.name].join('.'));
      if (fs.existsSync(destination) && !fs.readFileSync(source).equals(fs.readFileSync(destination))) {
        throw new Error(`Refusing conflicting segment output: ${destination}`);
      }
      fs.copyFileSync(source, destination);
      count++;
    }
  }
}
if (process.platform === 'win32') visit(root);
console.log(`[normalize-export] ${count} Windows segment assets copied; HTML untouched.`);
