import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { server } = require('../src/server.cjs');

describe('Desktop Static Server & Reverse Proxy (apps/desktop/src/server.cjs)', () => {
  let desktopServer;
  let mockBackendServer;
  let testDesktopPort;
  let mockBackendPort;

  before(async () => {
    // 1. Start mock backend on ephemeral port
    mockBackendServer = createServer((req, res) => {
      if (req.url === '/health/live') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'live' }));
        return;
      }
      if (req.url === '/api/v1/conversations/test-stream') {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });
        res.write('data: {"type":"chunk","content":"hello"}\n\n');
        res.end();
        return;
      }
      res.writeHead(404).end();
    });

    await new Promise((resolve) => mockBackendServer.listen(0, '127.0.0.1', resolve));
    mockBackendPort = mockBackendServer.address().port;

    // 2. Start desktop server pointing to mock backend
    desktopServer = server({ backendPort: mockBackendPort });
    await new Promise((resolve) => desktopServer.listen(0, '127.0.0.1', resolve));
    testDesktopPort = desktopServer.address().port;
  });

  after(async () => {
    if (desktopServer) {
      desktopServer.closeTerminalChannels?.();
      desktopServer.closeAllConnections?.();
      await new Promise((resolve) => desktopServer.close(resolve));
    }
    if (mockBackendServer) {
      await new Promise((resolve) => mockBackendServer.close(resolve));
    }
  });

  test('Forbidden origin is rejected with 403', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/`, {
      headers: { Origin: 'http://malicious-site.com' },
    });
    assert.equal(res.status, 403);
  });

  test('Allowed origin serves static index.html or fallback', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/`, {
      headers: { Origin: `http://127.0.0.1:5176` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /text\/html/);
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(res.headers.get('content-security-policy'));
  });

  test('Offline service worker stub is served at /sw.js', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/sw.js`, {
      headers: { Origin: `http://127.0.0.1:5176` },
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /application\/javascript/);
    const text = await res.text();
    assert.ok(text.includes('Sirona desktop offline worker'));
  });

  test('Canonical /health/live calls are cleanly reverse-proxied to backend', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/health/live`, {
      headers: { Origin: `http://127.0.0.1:5176` },
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'live');
  });

  test('SSE stream through reverse proxy sets X-Accel-Buffering: no', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/api/v1/conversations/test-stream`, {
      headers: { Origin: `http://127.0.0.1:5176` },
    });
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-accel-buffering'), 'no');
    assert.match(res.headers.get('content-type'), /text\/event-stream/);
    const body = await res.text();
    assert.ok(body.includes('chunk'));
  });

  test('Unsupported HTTP methods on static routes return 405', async () => {
    const res = await fetch(`http://127.0.0.1:${testDesktopPort}/not-an-api`, {
      method: 'POST',
      body: JSON.stringify({}),
      headers: {
        'Content-Type': 'application/json',
        Origin: `http://127.0.0.1:5176`,
      },
    });
    assert.equal(res.status, 405);
  });
});
