import fs from 'node:fs';
import path from 'node:path';

const dirs = ['backend/services', 'backend/routes', 'backend/foundation', 'backend/config'];
const suspicious = ['subtract', 'calculator', 'calculator\\.js', 'inventory', 'hardcoded', 'synthetic', 'regex patch', 'tool_calls: \\[\\]', '_tools'];

function walk(dir) {
  let res = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) res = res.concat(walk(full));
    else if (f.endsWith('.js')) res.push(full);
  }
  return res;
}

const files = dirs.flatMap(d => walk(d));
console.log('Scanning ' + files.length + ' production files...');

let hits = [];
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const s of suspicious) {
    const reg = new RegExp('\\b' + s + '\\b', 'gi');
    let match;
    while ((match = reg.exec(content)) !== null) {
      const line = content.substring(0, match.index).split('\n').length;
      const snippet = content.split('\n')[line - 1].trim();
      hits.push({ pattern: s, file, line, snippet });
    }
  }
}

console.log('Total hits found: ' + hits.length);
hits.forEach(h => console.log(`[${h.pattern}] ${h.file}:${h.line} -> ${h.snippet}`));
