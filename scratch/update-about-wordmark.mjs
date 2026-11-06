import * as fs from 'fs';

const filePath = 'apps/web/src/settings/about/animated-wordmark.tsx';
let c = fs.readFileSync(filePath, 'utf8');
c = c.replace(
  'const target = ["o", "p", "e", "n", "c", "o", "d", "e"] as const',
  'const target = ["s", "i", "r", "o", "n", "a"] as const'
);
c = c.replace(
  'const choices = ["o", "p", "e", "n", "c", "d"] as const',
  'const choices = ["s", "i", "r", "o", "n", "a"] as const'
);
fs.writeFileSync(filePath, c, 'utf8');
console.log('Updated animated-wordmark.tsx');
