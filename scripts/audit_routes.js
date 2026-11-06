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

console.log(`Total backend routes: ${routes.length}`);

const clientContent = fs.readFileSync(path.join(process.cwd(), 'frontend', 'sirona', 'src', 'api', 'client.ts'), 'utf8');

// Match all methods in ApiClient
const clientMethods = [...clientContent.matchAll(/async\s+([a-zA-Z0-9_]+)\s*\([^)]*\)\s*:\s*Promise<[^>]+>\s*\{([^}]+)\}/gs)];
console.log(`Total methods in ApiClient: ${clientMethods.length}`);

// For each route, see if its template pattern is in clientContent
// e.g. /projects/:projectId/scans -> `/projects/${...}/scans` or `/projects/${projectId}/scans`
const missingRoutes = [];
const mappedRoutes = [];

for (const r of routes) {
  // convert :param to regex [^/]+
  const escaped = r.path.replace(/:[a-zA-Z0-9_]+/g, '\\${[^}]+}');
  const regex1 = new RegExp(escaped.replace(/\//g, '\\/'));
  // also check literal
  const literalPath = r.path.replace(/:[a-zA-Z0-9_]+/g, '');
  
  // check if clientContent has the path string
  const pathParts = r.path.split('/').filter(p => !p.startsWith(':') && p.length > 0);
  const allPartsFound = pathParts.every(part => clientContent.includes(part));
  
  if (regex1.test(clientContent) || clientContent.includes(r.path)) {
    mappedRoutes.push(r);
  } else {
    missingRoutes.push(r);
  }
}

console.log(`Directly matched routes in client.ts: ${mappedRoutes.length}`);
console.log(`Unmatched or parameterized routes: ${missingRoutes.length}`);
missingRoutes.forEach(r => console.log(`  ${r.method.padEnd(7)} ${r.path.padEnd(55)} (${r.file})`));
