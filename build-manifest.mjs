// Genera sw-manifest.js con la lista de archivos a precachear para uso offline.
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
const skip = new Set(['node_modules', '.git', 'package.json', 'package-lock.json', 'README.md', 'sw-manifest.js', 'serve.js', 'build-manifest.mjs', 'iniciar.bat', 'netlify.toml', '.gitignore']);
const files = []; let stamp = 0;
(function walk(d) {
  for (const n of readdirSync(d)) {
    if (skip.has(n)) continue;
    const p = join(d, n), s = statSync(p);
    if (s.isDirectory()) walk(p); else { files.push(relative('.', p).split('\\').join('/')); stamp = Math.max(stamp, s.mtimeMs) + s.size % 7; }
  }
})('.');
writeFileSync('sw-manifest.js', `self.__VERSION='${Math.floor(stamp).toString(36)}';\nself.__FILES=${JSON.stringify(['./', ...files], null, 1)};\n`);
console.log(`sw-manifest.js: ${files.length} archivos`);
