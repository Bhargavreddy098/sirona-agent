// generate-test-manifest.js
// Generates a JSON manifest of test files for the specified package.
// Usage: node scripts/generate-test-manifest.js --pkg <pkg> --out <path>

import { resolve, join } from 'path';
import { readdir, stat } from 'fs/promises';

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { pkg: 'server', out: 'test-manifest.json' };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--pkg=')) {
      result.pkg = arg.split('=')[1];
    } else if (arg === '--pkg' && i + 1 < args.length) {
      result.pkg = args[++i];
    } else if (arg.startsWith('--out=')) {
      result.out = arg.split('=')[1];
    } else if (arg === '--out' && i + 1 < args.length) {
      result.out = args[++i];
    }
  }
  return result;
}

async function collectTests(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const tests = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      // skip __sample__ directories (used for intentional fixtures)
      if (entry.name === '__sample__') continue;
      tests.push(...await collectTests(fullPath));
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.test.js') || entry.name.endsWith('.test.ts')) {
        tests.push(resolve(fullPath));
      }
    }
  }
  return tests;
}

async function main() {
  const { pkg, out } = parseArgs();
  const testDir = resolve(`apps/${pkg}/tests`);
  const manifest = await collectTests(testDir);
  await import('fs/promises').then(m => m.writeFile(out, JSON.stringify(manifest, null, 2)));
  console.log(`Generated manifest with ${manifest.length} test files to ${out}`);
}

main().catch(err => {
  console.error('Manifest generation failed:', err);
  process.exit(1);
});
