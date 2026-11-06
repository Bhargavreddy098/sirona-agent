// run-test-with-exit.js
// Wrapper around Node's built‑in test runner that forces a non‑zero exit code
// when any assertion fails. This satisfies Stage 1 requirement that the CI
// surface reflects failures.

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { pkg: 'server', useDb: false, skipDb: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith('--pkg=')) result.pkg = a.split('=')[1];
    else if (a === '--pkg' && i + 1 < args.length) result.pkg = args[++i];
    else if (a === '--use-db') result.useDb = true;
    else if (a === '--skip-db') result.skipDb = true;
  }
  return result;
}

async function generateManifest(pkg) {
  const manifestPath = path.resolve('test-manifest.json');
  const cmd = `node scripts/generate-test-manifest.js --pkg ${pkg} --out "${manifestPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  const content = readFileSync(manifestPath, 'utf-8');
  return JSON.parse(content);
}

function filterDbTests(manifest, skipDb) {
  if (!skipDb) return manifest;
  // Simple heuristic – any test that imports a known DB module.
  const dbPatterns = [/\bpg\b/, /\btypedDatabaseBoundary\b/, /\bdatabase\b/i];
  const filtered = [];
  for (const file of manifest) {
    const src = readFileSync(file, 'utf-8');
    const isDb = dbPatterns.some(p => p.test(src));
    if (!isDb) filtered.push(file);
  }
  console.log(`Skipped ${manifest.length - filtered.length} DB‑related test files`);
  return filtered;
}

function runTests(testFiles) {
  // Node test runner with setup import. Concurrency limited to 1 for determinism.
  const filesArg = testFiles.map(p => `"${p}"`).join(' ');
  const cmd = `node --import ./test/setup.js --test --test-concurrency=1 --test-timeout=15000 ${filesArg}`;
  try {
    const output = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    process.stdout.write(output);
    const hasFailure = output.split('\n').some(l => l.trim().startsWith('✖'));
    process.exit(hasFailure ? 1 : 0);
  } catch (e) {
    console.error('Test runner crashed:', e);
    process.exit(1);
  }
}

async function main() {
  const { pkg, useDb, skipDb } = parseArgs();
  if (useDb) console.log('Database fixture mode requested – not implemented in Stage 1');
  let manifest = await generateManifest(pkg);
  manifest = filterDbTests(manifest, skipDb);
  runTests(manifest);
}

main().catch(err => {
  console.error('Unexpected error in wrapper:', err);
  process.exit(1);
});
