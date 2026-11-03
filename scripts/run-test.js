// run-test.js
// Thin shim that forwards to the robust wrapper.
import { spawn } from 'child_process';
import path from 'path';

const wrapperPath = path.resolve('scripts/run-test-with-exit.js');
const proc = spawn('node', [wrapperPath, ...process.argv.slice(2)], { stdio: 'inherit' });
proc.on('close', (code) => {
  process.exit(code);
});

// Entry point for the full backend test command.
// Supports --pkg <package> (server, web, cli) and optional flags.

import { execSync } from 'child_process';
import { readFile, writeFile } from 'fs/promises';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { pkg: 'server', useDb: false, skipDb: false };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--pkg=')) {
      result.pkg = arg.split('=')[1];
    } else if (arg === '--pkg' && i + 1 < args.length) {
      result.pkg = args[++i];
    } else if (arg === '--use-db') {
      result.useDb = true;
    } else if (arg === '--skip-db') {
      result.skipDb = true;
    }
  }
  return result;
}

async function generateManifest(pkg) {
  const manifestPath = path.resolve('test-manifest.json');
  const cmd = `node scripts/generate-test-manifest.js --pkg ${pkg} --out "${manifestPath}"`;
  execSync(cmd, { stdio: 'inherit' });
  const manifestContent = await readFile(manifestPath, 'utf-8');
  return JSON.parse(manifestContent);
}

async function runTests(manifest) {
  // Node's built-in test runner with setup.
  const testFiles = manifest.map(p => `"${p}"`).join(' ');
  const cmd = `node --import ./test/setup.js --test --test-concurrency=1 --test-timeout=15000 ${testFiles}`;
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
// Parse additional flags
  const { pkg, useDb, skipDb } = parseArgs();
  // Database fixture handling (stage 2) placeholder.
  if (useDb) {
    console.log('Database fixture mode enabled – not implemented in Stage 1');
  }
  let manifest = await generateManifest(pkg);
  if (skipDb) {
    const skipPatterns = [/database/i, /typedDatabaseBoundary/i, /pgDriver/i];
    manifest = manifest.filter(p => !skipPatterns.some(r => r.test(p)));
    console.log(`Skipped ${manifest.length} DB-related test files`);
  }
  await runTests(manifest);
}

main().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
