import fs from 'node:fs';
import http from 'node:http';
import { EventEmitter } from 'node:events';
import path from 'node:path';

process.env.SIRONA_DB_PATH = path.resolve('./apps/server/data/sirona.db');
process.env.ALLOW_DEV_BOOTSTRAP = 'true';
process.env.NODE_ENV = 'development';

async function verifyCollection() {
  const collection = JSON.parse(fs.readFileSync('./sirona.postman_collection.json', 'utf8'));
  const { createApp } = await import('./apps/server/app.js');
  const { createHealthController } = await import('./apps/server/controllers/healthController.js');
  const routes = (await import('./apps/server/routes/index.js')).default;
  const { auditContext } = await import('./apps/server/middleware/auditContext.js');
  const { stage17Admission } = await import('./apps/server/foundation/admission.js');
  const sqliteDb = await import('./apps/server/config/sqliteDb.js');
  sqliteDb.initDatabase();

  const health = createHealthController({
    checkDatabase: () => sqliteDb.query('SELECT 1 AS alive').then(r => r.rows[0]?.alive === 1),
    cleanExpiredLeases: async () => {},
    readinessTimeoutMs: 2000
  });

  const app = createApp({
    healthController: health,
    apiRoutes: routes,
    auditContext: auditContext,
    rateLimiter: (req, res, next) => next(),
    allowedOrigins: ['http://127.0.0.1:8000', 'http://localhost:3000'],
    logError: (err) => {},
    accepting: () => true,
    admission: stage17Admission
  });

  function dispatch(method, url, headers = {}, body = null) {
    return new Promise((resolve) => {
      const socket = new EventEmitter();
      socket.remoteAddress = '127.0.0.1';
      socket.localPort = 8000;
      socket.encrypted = false;
      
      const req = new http.IncomingMessage(socket);
      req.method = method;
      req.url = url;
      req.headers = {
        host: '127.0.0.1:8000',
        ...headers
      };
      const raw = ['Host', '127.0.0.1:8000'];
      for (const [k, v] of Object.entries(headers)) {
        raw.push(k, v);
      }
      if (body && !headers['content-type']) {
        req.headers['content-type'] = 'application/json';
        raw.push('Content-Type', 'application/json');
      }
      req.rawHeaders = raw;
      
      const res = new http.ServerResponse(req);
      let chunks = [];
      res.write = function(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        return true;
      };
      res.end = function(chunk) {
        if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        const bodyStr = Buffer.concat(chunks).toString('utf8');
        let parsed = bodyStr;
        try { parsed = JSON.parse(bodyStr); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.getHeaders(),
          body: parsed
        });
      };
      
      app(req, res);
      
      if (body) {
        req.push(typeof body === 'string' ? body : JSON.stringify(body));
      }
      req.push(null);
    });
  }

  let cookie = '';
  let passed = 0;
  let total = 0;

  for (const group of collection.item) {
    console.log('\n--- ' + group.name + ' ---');
    for (const item of group.item) {
      total++;
      const reqDef = item.request;
      const method = reqDef.method;
      const url = reqDef.url.raw.replace('{{baseUrl}}', '');
      const headers = {};
      if (cookie) headers['cookie'] = cookie;
      const body = reqDef.body?.raw ? JSON.parse(reqDef.body.raw) : null;
      
      const res = await dispatch(method, url, headers, body);
      if (item.name.includes('Bootstrap')) {
        const rawCookie = res.headers['set-cookie'];
        cookie = Array.isArray(rawCookie) ? rawCookie[0].split(';')[0] : (rawCookie ? rawCookie.split(';')[0] : '');
      }

      const isPass = res.statusCode >= 200 && res.statusCode < 300;
      if (isPass) passed++;
      const statusIcon = isPass ? 'PASS' : 'FAIL';
      console.log(`[${statusIcon}] [${res.statusCode}] ${method} ${url} - ${item.name}`);
    }
  }

  console.log(`\n========================================`);
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
  console.log(`========================================`);
}

verifyCollection().catch(console.error);
