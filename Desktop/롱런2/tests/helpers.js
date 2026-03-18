import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname2 = path.dirname(fileURLToPath(import.meta.url));

export function loadScript(filename) {
  const code = fs.readFileSync(path.join(__dirname2, '../src/js/', filename), 'utf8');
  // Replace var with globalThis assignments
  const transformed = code
    .replace(/^var (\w+)/gm, 'globalThis.$1')
    .replace(/^function (\w+)/gm, 'globalThis.$1 = function $1');
  new Function(transformed)();
}

export function loadScripts(files) {
  files.forEach(f => loadScript(f));
}
