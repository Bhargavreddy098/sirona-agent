const { createServer, request } = require('node:http');
const { readFile, stat } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const { attachTerminalProxy } = require('./terminalProxy.cjs');

const port = 5176;
const origin = `http://127.0.0.1:${port}`;

function server(options = {}) {
  const backendPort = options.backendPort ?? 8000;
  const root = resolve(__dirname, '../../web/dist');

  const listener = createServer(async (req, res) => {
    const allowedOrigins = new Set([
      origin,
      'http://localhost:5176',
      'http://127.0.0.1:5178',
      'http://localhost:5178',
    ]);
    if (req.headers.origin && !allowedOrigins.has(req.headers.origin)) {
      res.writeHead(403).end();
      return;
    }

    // Service Worker stub for offline handling
    if (req.url === '/sw.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('// Sirona desktop offline worker\nself.addEventListener("install", () => self.skipWaiting());\nself.addEventListener("activate", () => self.clients.claim());\n');
      return;
    }

    // Canonical API and health reverse proxy to Sirona backend (port 8000)
    if (req.url.startsWith('/api/') || req.url.startsWith('/health')) {
      const upstream = request(
        {
          hostname: '127.0.0.1',
          port: backendPort,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: `127.0.0.1:${backendPort}` },
          timeout: 180000,
        },
        (reply) => {
          // Disable buffering on proxy response (critical for SSE streaming)
          res.setHeader('X-Accel-Buffering', 'no');
          res.writeHead(reply.statusCode ?? 502, reply.headers);
          reply.pipe(res);
        }
      );

      upstream.on('error', () => {
        if (!res.headersSent) {
          res.writeHead(503, { 'Content-Type': 'application/problem+json' });
          res.end(
            JSON.stringify({
              type: 'about:blank',
              title: 'Service Unavailable',
              status: 503,
              detail: 'The Sirona backend is unavailable.',
              code: 'BACKEND_UNAVAILABLE',
            })
          );
        }
      });

      upstream.on('timeout', () => upstream.destroy());
      req.on('aborted', () => upstream.destroy());
      res.on('close', () => upstream.destroy());
      req.pipe(upstream);
      return;
    }

    // Static asset serving (apps/web/dist)
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405).end();
      return;
    }

    try {
      const pathname = new URL(req.url, origin).pathname;
      let file = resolve(root, `.${pathname === '/' ? '/index.html' : decodeURIComponent(pathname)}`);
      if (!file.startsWith(root + sep) && file !== resolve(root, 'index.html')) {
        res.writeHead(403).end();
        return;
      }

      let fileToRead = file;
      try {
        const fileStat = await stat(fileToRead);
        if (fileStat.isDirectory()) fileToRead = resolve(root, 'index.html');
      } catch {
        fileToRead = resolve(root, 'index.html');
      }

      const value = await readFile(fileToRead);
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.ico': 'image/x-icon',
        '.wasm': 'application/wasm',
      };

      res.writeHead(200, {
        'Content-Type': mimeTypes[extname(fileToRead)] ?? 'application/octet-stream',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy':
          "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' http: ws:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
      });
      res.end(req.method === 'HEAD' ? undefined : value);
    } catch {
      res.writeHead(404).end();
    }
  });

  listener.closeTerminalChannels = attachTerminalProxy(listener, { port, origin, backendPort });
  if (typeof listener.closeAllConnections !== 'function') {
    listener.closeAllConnections = () => {};
  }
  return listener;
}

if (require.main === module) {
  const s = server();
  s.listen(port, '127.0.0.1', () => {
    console.log(`[Sirona] Web UI server listening at ${origin}`);
  });
}

module.exports = { server, port, origin };
