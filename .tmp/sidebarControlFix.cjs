const fs=require('node:fs');
const app='frontend/sirona-next/src/app/App.tsx',css='frontend/sirona-next/src/styles/app.css';
let text=fs.readFileSync(app,'utf8');if(!text.includes('className="icon-button collapse"'))throw new Error('Sidebar control source changed');fs.writeFileSync(app,text.replace('className="icon-button collapse"','className="icon-button sidebar-collapse"'));
text=fs.readFileSync(css,'utf8');if(!text.includes('.brand .collapse'))throw new Error('Sidebar style source changed');fs.writeFileSync(css,text.replaceAll('.brand .collapse','.brand .sidebar-collapse'));
