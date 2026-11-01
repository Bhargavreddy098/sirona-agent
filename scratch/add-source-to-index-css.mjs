import * as fs from 'fs';

const file = 'apps/web/src/index.css';
let content = fs.readFileSync(file, 'utf8');
if (!content.includes('@source "./**/*.{ts,tsx}";')) {
  content = '@source "./**/*.{ts,tsx}";\n@source "../index.html";\n' + content;
  fs.writeFileSync(file, content, 'utf8');
  console.log('Added @source to apps/web/src/index.css');
}

