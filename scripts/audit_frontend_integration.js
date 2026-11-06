import fs from 'node:fs';
import path from 'node:path';

const routesDir = path.join(process.cwd(), 'backend', 'routes', 'v1');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.routes.js'));

const routes = [];
for (const f of routeFiles) {
  const content = fs.readFileSync(path.join(routesDir, f), 'utf8');
  const matches = content.matchAll(/router\.(get|post|put|patch|delete)\s*\(\s*['"]([^'"]+)['"]/g);
  for (const m of matches) {
    routes.push({ file: f, method: m[1].toUpperCase(), path: m[2] });
  }
}

const clientContent = fs.readFileSync(path.join(process.cwd(), 'frontend', 'sirona', 'src', 'api', 'client.ts'), 'utf8');

function routeToKeywords(rPath) {
  // e.g. /projects/:projectId/schedules/preview -> ['projects', 'schedules', 'preview']
  return rPath.split('/').filter(p => !p.startsWith(':') && p.length > 0);
}

const trulyMissing = [];
for (const r of routes) {
  const keywords = routeToKeywords(r.path);
  // Check if clientContent has a line mentioning all these keywords together or in path
  const hasAll = keywords.every(k => clientContent.includes(k));
  if (!hasAll) {
    trulyMissing.push(r);
  }
}

console.log(`Checked ${routes.length} backend routes.`);
console.log(`Routes with keywords missing from client.ts (${trulyMissing.length}):`);
trulyMissing.forEach(r => console.log(`  ${r.method.padEnd(7)} ${r.path.padEnd(50)} (${r.file})`));

// Now let's check which routes exist in client.ts, but are NEVER called in any UI component (.tsx)
const srcDir = path.join(process.cwd(), 'frontend', 'sirona', 'src');
function getTsxFiles(dir) {
  let res = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (!item.includes('node_modules') && !item.includes('dist')) {
        res = res.concat(getTsxFiles(full));
      }
    } else if (item.endsWith('.tsx') && !item.endsWith('.test.tsx')) {
      res.push(full);
    }
  }
  return res;
}

const tsxFiles = getTsxFiles(srcDir);
const allTsx = tsxFiles.map(f => fs.readFileSync(f, 'utf8')).join('\n');

// Find all method names in ApiClient: e.g. async methodName(...)
const methodMatches = [...clientContent.matchAll(/async\s+([a-zA-Z0-9_]+)\s*\(/g)];
const methods = [...new Set(methodMatches.map(m => m[1]))];

const unusedMethods = [];
for (const m of methods) {
  if (['request', 'requestRaw', 'watchRunEvents'].includes(m)) continue;
  // check if method name appears in any .tsx file
  const regex = new RegExp(`\\b${m}\\b`);
  if (!regex.test(allTsx)) {
    unusedMethods.push(m);
  }
}

console.log(`\nTotal ApiClient methods: ${methods.length}`);
console.log(`Methods not currently invoked in any .tsx component (${unusedMethods.length}):`);
unusedMethods.forEach(m => console.log(`  apiClient.${m}`));
