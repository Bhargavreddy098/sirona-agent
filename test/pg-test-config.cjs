// test/pg-test-config.cjs
/**
 * Unit‑test for the disposable PostgreSQL orchestrator helpers.
 * Runs with MOCK_DOCKER=1 so no real Docker is touched.
 */

process.env.MOCK_DOCKER = '1';

const assert = require('assert');
const path = require('path');
const {
  startContainer,
  verifyRunning,
  getMappedPort,
  waitForReady,
  cleanupContainer,
} = require('../scripts/docker-helper');

(async () => {
  const initSql = path.resolve(__dirname, '..', 'docker', 'postgres', 'init.sql');
  // 1. start container
  const { containerId, containerName } = startContainer(initSql);
  console.log('Container started:', containerName, containerId);
  assert.ok(containerId.startsWith('mocked-'), 'container ID should be mocked');

  // 2. verify running
  assert.ok(verifyRunning(containerName), 'container should be reported running');

  // 3. get mapped port
  const port = getMappedPort(containerName);
  console.log('Mapped port:', port);
  assert.strictEqual(port, '54321', 'mocked port should be 54321');

  // 4. wait for ready (mock returns ready immediately)
  const ready = waitForReady(containerName);
  assert.ok(ready, 'container should be ready');

  // 5. cleanup
  cleanupContainer(containerName);
  console.log('Cleanup successful');
})();
