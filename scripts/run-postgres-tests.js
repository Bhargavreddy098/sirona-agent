// scripts/run-postgres-tests.js
/**
 * Orchestrates a disposable PostgreSQL Docker container for backend test execution.
 * Uses the Docker helper utilities to keep the logic testable and mockable.
 *
 * This script adheres to the Stage 2 requirements:
 *   • UUID‑based container name & label.
 *   • Random host port (Docker assigns it).
 *   • Verifies image, running state, port mapping.
 *   • Exposes TEST_PG_URL env var for the test runner.
 *   • Handles SIGINT/SIGTERM, startup timeout, deterministic cleanup.
 *   • No real Docker start is performed when MOCK_DOCKER=1.
 */

const path = require('path');
const { spawn } = require('child_process');
const {
  startContainer,
  verifyRunning,
  getMappedPort,
  waitForReady,
  cleanupContainer,
} = require('./docker-helper');

// Configuration – matches production approved PostgreSQL major version.
const POSTGRES_IMAGE = 'postgres:16-alpine';
const INIT_SQL_PATH = path.resolve(__dirname, '..', 'docker', 'postgres', 'init.sql');

async function main() {
  // 1️⃣ Start container
  const { containerId, containerName } = startContainer(INIT_SQL_PATH);
  console.log('✅ Started container', containerName, containerId);

  // Register cleanup for signals.
  const cleanup = () => {
    try { cleanupContainer(containerName); } catch (_) {}
  };
  process.on('SIGINT', () => { cleanup(); process.exit(130); });
  process.on('SIGTERM', () => { cleanup(); process.exit(143); });

  // 2️⃣ Verify container is running
  if (!verifyRunning(containerName)) {
    console.error('❌ Container not running after start');
    cleanup();
    process.exit(1);
  }

  // 3️⃣ Get host port
  let hostPort;
  try {
    hostPort = getMappedPort(containerName);
  } catch (e) {
    console.error('❌ Failed to obtain mapped port:', e.message);
    cleanup();
    process.exit(1);
  }

  // 4️⃣ Build TEST_PG_URL (password hidden from console)
  const user = 'test_user';
  const password = 'test_pass'; // secret – never logged
  const db = 'test_db';
  process.env.TEST_PG_URL = `postgresql://${user}:${password}@127.0.0.1:${hostPort}/${db}`;
  console.log(`✅ PostgreSQL reachable at 127.0.0.1:${hostPort}`);

  // 5️⃣ Wait for DB readiness (timeout enforced)
  if (!waitForReady(containerName)) {
    console.error('❌ PostgreSQL did not become ready in time');
    cleanup();
    process.exit(1);
  }

  // 6️⃣ Run full backend test suite (Stage 2 enabled)
  const testRunner = path.resolve(__dirname, 'run-test-with-exit.js');
  const child = spawn('node', [testRunner, '--pkg', 'server'], { stdio: 'inherit' });
  const exitCode = await new Promise(res => child.on('close', res));

  // 7️⃣ Cleanup container
  cleanup();

  process.exit(exitCode);
}

if (require.main === module) {
  main();
}

module.exports = { main };
