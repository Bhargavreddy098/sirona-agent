import * as fs from 'fs';
import * as path from 'path';

function search(dir) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    if (f.name === 'node_modules' || f.name === 'dist' || f.name === 'src-react-backup' || f.name === '.git') continue;
    const p = path.join(dir, f.name);
    if (f.isDirectory()) search(p);
    else if (f.name.endsWith('.tsx') || f.name.endsWith('.ts') || f.name.endsWith('.html') || f.name.endsWith('.cjs') || f.name.endsWith('.json')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes('"OpenCode"') || c.includes("'OpenCode'") || c.includes('OpenCode')) {
        const matches = [];
        const lines = c.split('\n');
        lines.forEach((l, idx) => {
          if (l.includes('OpenCode') && !l.includes('@opencode/')) {
            matches.push(`${idx + 1}: ${l.trim()}`);
          }
        });
        if (matches.length > 0) {
          console.log(p);
          matches.slice(0, 5).forEach(m => console.log('  ', m));
        }
      }
    }
  }
}

search('apps');
search('packages');
