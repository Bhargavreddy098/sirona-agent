// scripts/docker-helper.js
/**
 * Helper utilities for managing a disposable PostgreSQL Docker container.
 * All functions are pure and return promises/strings; they are safe to unit‑test.
 * When the environment variable MOCK_DOCKER=1 is set, Docker commands are mocked
 * with deterministic responses (no external processes are started).
 */

const { execSync } = require('child_process');
const { randomUUID } = require('crypto');

const POSTGRES_IMAGE = 'postgres:16-alpine';
const CONTAINER_LABEL = 'sirona-test-pg';
const STARTUP_TIMEOUT_MS = 30_000;

/** Run a command synchronously, returning trimmed stdout. */
function runCmd(cmd, args = []) {
  try {
    const out = execSync([cmd, ...args].join(' '), { encoding: 'utf8' });
    return out.trim();
  } catch (e) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}\n${e.stderr || e.message}`);
  }
}

/** Wrapper that either calls real Docker or a mock implementation. */
function docker(args) {
  if (process.env.MOCK_DOCKER === '1') return mockDocker(args);
  return runCmd('docker', args);
}

/** Deterministic mock used by unit tests. */
function mockDocker(args) {
  const sub = args[0];
  // Simple in‑memory store for created containers.
  const store = global.__MOCK_DOCKER_STORE || (global.__MOCK_DOCKER_STORE = {});
  if (sub === 'run') {
    const nameIdx = args.indexOf('--name');
    const name = nameIdx >= 0 ? args[nameIdx + 1] : `mock-${randomUUID()}`;
    const id = `mocked-${name}`;
    store[id] = { name, running: true, port: 54321 };
    return id;
  }
  if (sub === 'port') {
    const container = args[1];
    const info = store[container];
    if (!info) throw new Error('Container not found');
    return `127.0.0.1:${info.port}`;
  }
  if (sub === 'inspect') {
    const container = args[args.length - 1];
    const info = store[container];
    if (!info) return '';
    if (args.includes('{{.State.Running}}')) return info.running ? 'true' : 'false';
    return '';
  }
  if (sub === 'exec') {
    // Simulate pg_isready returning ready after a short delay.
    const container = args[1];
    const cmd = args.slice(2).join(' ');
    if (cmd.includes('pg_isready')) {
      return 'localhost:5432 - accepting connections';
    }
    return '';
  }
  if (sub === 'rm') {
    const container = args[args.length - 1];
    delete store[container];
    return '';
  }
  return '';
}

/** Start a PostgreSQL container and return its ID and name. */
function startContainer(initSqlPath) {
  const uuid = randomUUID();
  const containerName = `${CONTAINER_LABEL}-${uuid}`;
  const runArgs = [
    'run', '-d', '--name', containerName,
    '-e', 'POSTGRES_USER=test_user',
    '-e', 'POSTGRES_PASSWORD=test_pass',
    '-e', 'POSTGRES_DB=test_db',
    '-v', `${initSqlPath}:/docker-entrypoint-initdb.d/init.sql:ro`,
    '-p', ':5432', // random host port
    POSTGRES_IMAGE,
  ];
  const containerId = docker(runArgs).split('\n')[0];
  return { containerId, containerName };
}

/** Verify that a container is running. */
function verifyRunning(containerName) {
  const out = docker(['inspect', '-f', '{{.State.Running}}', containerName]);
  return out.trim() === 'true';
}

/** Get the host port mapped to PostgreSQL's 5432/tcp. */
function getMappedPort(containerName) {
  const out = docker(['port', containerName, '5432/tcp']).trim();
  const match = out.match(/:(\d+)$/);
  if (!match) throw new Error('Unable to parse mapped port');
  return match[1];
}

/** Wait for the DB inside the container to become ready. */
function waitForReady(containerName) {
  const start = Date.now();
  while (Date.now() - start < STARTUP_TIMEOUT_MS) {
    try {
      const ready = docker(['exec', containerName, 'pg_isready', '-U', 'test_user']);
      if (ready.includes('accepting connections')) return true;
    } catch (_) {}
    // eslint-disable-next-line no‑bitwise
    const wait = 500;
    const end = Date.now();
    if (end - start >= STARTUP_TIMEOUT_MS) break;
    // Sleep synchronously (acceptable for this helper).
    execSync(`powershell -Command "Start-Sleep -Milliseconds ${wait}"`);
  }
  return false;
}

/** Stop and remove the container. */
function cleanupContainer(containerName) {
  try {
    docker(['rm', '-f', containerName]);
  } catch (e) {
    console.error('Cleanup failed for container', containerName, e.message);
    throw e;
  }
}

module.exports = {
  docker,
  mockDocker,
  startContainer,
  verifyRunning,
  getMappedPort,
  waitForReady,
  cleanupContainer,
};
