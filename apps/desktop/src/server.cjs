const { createServer, request } = require('node:http');
const { readFile, stat, readdir } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const crypto = require('node:crypto');
const { attachTerminalProxy } = require('./terminalProxy.cjs');

const port = 5176;
const origin = `http://127.0.0.1:${port}`;

function server(){
  const root=resolve(__dirname,'../../web/dist');
  const workspaceRoot=resolve(__dirname,'../../..');
  const localProjects = new Map([
    ['personal-agent', {
      id: 'personal-agent',
      canonical: workspaceRoot,
      worktree: workspaceRoot,
      worktrees: [{ directory: workspaceRoot }],
      vcs: 'git',
      name: 'personal -agent',
      time: { created: Date.now() - 86400000, updated: Date.now(), active: Date.now() },
      sandboxes: []
    }]
  ]);
  const createSessionObj = (id, title = 'Session', directory = workspaceRoot, projectID = 'personal-agent') => ({
    id,
    title,
    projectID,
    directory,
    location: { directory },
    cost: 0,
    tokens: { input: 0, output: 0, total: 0 },
    time: { created: Date.now() - 3600000, updated: Date.now(), active: Date.now() }
  });
  const localSessions=new Map([
    ['session-default', createSessionObj('session-default', 'Session')]
  ]);
  const sessionMessages=new Map();
  const sseClients=new Set();

  function broadcastSse(eventData) {
    const payload = `data: ${JSON.stringify(eventData)}\n\n`;
    for (const client of sseClients) {
      try { client.write(payload); } catch { sseClients.delete(client); }
    }
  }

  const listener=createServer(async(req,res)=>{
    const allowedOrigins = new Set([origin, 'http://localhost:5176', 'http://127.0.0.1:5178', 'http://localhost:5178']);
    if(req.headers.origin && !allowedOrigins.has(req.headers.origin)){res.writeHead(403).end();return;}
    
    // Service Worker stub
    if(req.url === '/sw.js'){
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end('// Sirona desktop offline worker\nself.addEventListener("install", () => self.skipWaiting());\nself.addEventListener("activate", () => self.clients.claim());\n');
      return;
    }

    // OpenCode SSE event stream
    if(req.url.startsWith('/api/event')){
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no'
      });
      res.write('data: {"type":"server.connected"}\n\n');
      sseClients.add(res);
      const timer = setInterval(() => {
        try { res.write(': keepalive\n\n'); } catch { clearInterval(timer); sseClients.delete(res); }
      }, 10000);
      req.on('close', () => { clearInterval(timer); sseClients.delete(res); });
      req.on('aborted', () => { clearInterval(timer); sseClients.delete(res); });
      return;
    }

    // OpenCode location & directory metadata
    if(req.url.startsWith('/api/location') || req.url.startsWith('/api/path')){
      const u = new URL(req.url, origin);
      let targetDir = u.searchParams.get('location[directory]') || u.searchParams.get('directory') || u.searchParams.get('path');
      if (!targetDir) {
        targetDir = workspaceRoot;
      } else {
        targetDir = resolve(targetDir);
      }
      let proj = Array.from(localProjects.values()).find(p => p.canonical === targetDir);
      if (!proj) {
        const projId = 'proj-' + crypto.createHash('md5').update(targetDir).digest('hex').slice(0, 8);
        const name = require('node:path').basename(targetDir) || 'Project';
        proj = {
          id: projId,
          canonical: targetDir,
          vcs: 'git',
          name,
          time: { created: Date.now(), updated: Date.now(), active: Date.now() },
          sandboxes: []
        };
        localProjects.set(projId, proj);
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        directory: targetDir,
        project: {
          id: proj.id,
          directory: targetDir,
          canonical: targetDir
        }
      }));
      return;
    }

    // OpenCode file listing for directory picker
    if(req.url.startsWith('/api/file')){
      try {
        const u = new URL(req.url, origin);
        const targetPath = u.searchParams.get('path') || workspaceRoot;
        const entries = await readdir(targetPath, { withFileTypes: true });
        const data = entries.map(e => ({
          name: e.name,
          path: resolve(targetPath, e.name),
          type: e.isDirectory() ? 'directory' : 'file'
        }));
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ location: { directory: targetPath }, data }));
      } catch {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      }
      return;
    }

    // OpenCode project list & management
    if(req.url === '/api/project' || req.url.startsWith('/api/project?') || req.url.startsWith('/api/project/')){
      if(req.method === 'POST'){
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const dir = resolve(parsed.directory || parsed.canonical || workspaceRoot);
            let proj = Array.from(localProjects.values()).find(p => p.canonical === dir);
            if (!proj) {
              const id = 'proj-' + crypto.createHash('md5').update(dir).digest('hex').slice(0, 8);
              const name = parsed.name || require('node:path').basename(dir) || 'Project';
              proj = {
                id,
                canonical: dir,
                vcs: 'git',
                name,
                time: { created: Date.now(), updated: Date.now(), active: Date.now() },
                sandboxes: []
              };
              localProjects.set(id, proj);
            }
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(proj));
          } catch {
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(localProjects.get('personal-agent')));
          }
        });
        return;
      }
      if(req.method === 'PATCH'){
        const projId = req.url.split('/')[3]?.split('?')[0];
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const proj = localProjects.get(projId);
          if (proj) {
            try {
              const parsed = JSON.parse(body);
              if (parsed.name) proj.name = parsed.name;
              if (parsed.icon) proj.icon = parsed.icon;
              proj.time.updated = Date.now();
            } catch {}
          }
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify(proj || localProjects.get('personal-agent')));
        });
        return;
      }
      res.writeHead(200, {'Content-Type': 'application/json'});
      if(req.url.startsWith('/api/project/')){
        const projId = req.url.split('/')[3]?.split('?')[0];
        const proj = localProjects.get(projId) || localProjects.get('personal-agent');
        res.end(JSON.stringify(proj));
        return;
      }
      res.end(JSON.stringify(Array.from(localProjects.values())));
      return;
    }

    // OpenCode VCS & git branch info
    if(req.url.startsWith('/api/vcs')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      if(req.url.startsWith('/api/vcs/base')){
        res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: null }));
        return;
      }
      if(req.url.startsWith('/api/vcs/status')){
        res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
        return;
      }
      if(req.url.startsWith('/api/vcs/branch')){
        res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: ['main'] }));
        return;
      }
      res.end(JSON.stringify({
        location: { directory: workspaceRoot },
        data: {
          provider: 'git',
          branch: { current: 'main', default: 'main' }
        }
      }));
      return;
    }

    // OpenCode configuration
    if(req.url.startsWith('/api/config')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify([
        {
          type: 'document',
          info: {
            model: 'opencode/beam-free',
            default_agent: 'default'
          }
        }
      ]));
      return;
    }

    // OpenCode agent list
    if(req.url.startsWith('/api/agent')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        location: { directory: workspaceRoot },
        data: [
          {
            id: 'default',
            name: 'Sirona Agent',
            request: { settings: {}, headers: {}, body: {} },
            mode: 'primary',
            hidden: false,
            permissions: []
          }
        ]
      }));
      return;
    }

    // OpenCode model providers
    if(req.url.startsWith('/api/provider')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        location: { directory: workspaceRoot },
        data: [
          { id: 'opencode', name: 'OpenCode', activation: 'auto', package: '' },
          { id: 'google', name: 'Google Gemini', activation: 'auto', package: '' },
          { id: 'anthropic', name: 'Anthropic', activation: 'auto', package: '' }
        ]
      }));
      return;
    }

    // OpenCode default model
    if(req.url.startsWith('/api/model/default')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        location: { directory: workspaceRoot },
        data: {
          id: 'beam-free',
          modelID: 'beam-free',
          providerID: 'opencode',
          name: 'Beam Free',
          capabilities: { temperature: true, reasoning: true, attachments: true, tools: true, input: ['text', 'image'], output: ['text'] },
          variants: [],
          time: { released: 0 },
          cost: [],
          status: 'active',
          enabled: true,
          limit: { context: 200000, output: 32000 }
        }
      }));
      return;
    }

    // OpenCode models
    if(req.url.startsWith('/api/model')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({
        location: { directory: workspaceRoot },
        data: [
          {
            id: 'beam-free',
            modelID: 'beam-free',
            providerID: 'opencode',
            name: 'Beam Free',
            capabilities: { temperature: true, reasoning: true, attachments: true, tools: true, input: ['text', 'image'], output: ['text'] },
            variants: [],
            time: { released: 0 },
            cost: [],
            status: 'active',
            enabled: true,
            limit: { context: 200000, output: 32000 }
          },
          {
            id: 'gemini-2.5-pro',
            modelID: 'gemini-2.5-pro',
            providerID: 'google',
            name: 'Gemini 2.5 Pro',
            capabilities: { temperature: true, reasoning: true, attachments: true, tools: true, input: ['text', 'image'], output: ['text'] },
            variants: [],
            time: { released: 0 },
            cost: [],
            status: 'active',
            enabled: true,
            limit: { context: 1000000, output: 64000 }
          },
          {
            id: 'claude-3-5-sonnet-latest',
            modelID: 'claude-3-5-sonnet-latest',
            providerID: 'anthropic',
            name: 'Claude 3.5 Sonnet',
            capabilities: { temperature: true, reasoning: true, attachments: true, tools: true, input: ['text', 'image'], output: ['text'] },
            variants: [],
            time: { released: 0 },
            cost: [],
            status: 'active',
            enabled: true,
            limit: { context: 200000, output: 8192 }
          }
        ]
      }));
      return;
    }

    // OpenCode usage limits
    if(req.url.startsWith('/api/experimental/usage')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: null }));
      return;
    }

    // OpenCode skills
    if(req.url.startsWith('/api/skill')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode plugins
    if(req.url.startsWith('/api/plugin')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode permissions
    if(req.url.startsWith('/api/permission')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode pty
    if(req.url.startsWith('/api/pty')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode artifact
    if(req.url.startsWith('/api/artifact')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode MCP catalog & server list
    if(req.url.startsWith('/api/mcp/resource')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: { resources: [], templates: [] } }));
      return;
    }
    if(req.url.startsWith('/api/mcp')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode location-scoped queries (shell, command, integration, reference, form, websearch)
    if(
      req.url.startsWith('/api/shell') ||
      req.url.startsWith('/api/command') ||
      req.url.startsWith('/api/integration') ||
      req.url.startsWith('/api/reference') ||
      req.url.startsWith('/api/form') ||
      req.url.startsWith('/api/session/form') ||
      req.url.startsWith('/api/websearch')
    ){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ location: { directory: workspaceRoot }, data: [] }));
      return;
    }

    // OpenCode worktrees
    if(req.url.startsWith('/api/worktree')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify([]));
      return;
    }

    // OpenCode session creation & management
    if(req.url === '/api/session/active' || req.url.startsWith('/api/session/active?')){
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({ data: {} }));
      return;
    }

    if(req.url === '/api/session' || req.url.startsWith('/api/session?')){
      if(req.method === 'GET'){
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          data: Array.from(localSessions.values()),
          cursor: { previous: null, next: null }
        }));
        return;
      }
      if(req.method === 'POST'){
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let title = 'Session';
          let projectID = 'personal-agent';
          let dir = workspaceRoot;
          try {
            const parsed = JSON.parse(body);
            if(parsed.title) title = parsed.title;
            if(parsed.projectID) projectID = parsed.projectID;
            if(parsed.location?.directory) dir = parsed.location.directory;
          } catch {}
          const id = crypto.randomUUID();
          const sess = createSessionObj(id, title, dir, projectID);
          localSessions.set(id, sess);
          broadcastSse({ type: 'session.created', session: sess });
          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({ data: sess }));
        });
        return;
      }
    }

    if(req.url.startsWith('/api/session/')){
      const sessionId = req.url.split('/')[3]?.split('?')[0];
      if(req.url.includes('/prompt') && req.method === 'POST'){
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          let promptText = '';
          try {
            const parsed = JSON.parse(body);
            if(parsed.prompt) promptText = parsed.prompt;
            else if(parsed.text) promptText = parsed.text;
            else if(Array.isArray(parsed.parts)) promptText = parsed.parts.filter(p => p.type === 'text').map(p => p.text).join(' ');
          } catch {}
          const sess = localSessions.get(sessionId) || createSessionObj(sessionId, promptText ? promptText.slice(0, 40) : 'Session');
          if(promptText && (sess.title === 'Session' || sess.title === 'New chat')){
            sess.title = promptText.slice(0, 40);
          }
          sess.time.updated = Date.now();
          sess.time.active = Date.now();
          localSessions.set(sessionId, sess);

          const userMsgId = 'msg-' + crypto.randomUUID();
          const userMsg = {
            id: userMsgId,
            sessionID: sessionId,
            time: { created: Date.now() },
            text: promptText,
            type: 'user'
          };

          const assistantMsgId = 'msg-' + crypto.randomUUID();
          const assistantMsg = {
            id: assistantMsgId,
            sessionID: sessionId,
            type: 'assistant',
            agent: 'default',
            model: { id: 'beam-free', providerID: 'opencode' },
            time: { created: Date.now(), completed: Date.now() },
            content: [
              {
                type: 'text',
                text: `I've received your request: "${promptText}". I am ready to help you analyze, plan, and edit code across your project workspace.`
              }
            ],
            finish: 'stop'
          };

          const msgs = sessionMessages.get(sessionId) || [];
          msgs.push(userMsg, assistantMsg);
          sessionMessages.set(sessionId, msgs);

          broadcastSse({ type: 'session.message.created', sessionID: sessionId, message: userMsg });
          broadcastSse({ type: 'session.message.created', sessionID: sessionId, message: assistantMsg });
          broadcastSse({ type: 'session.updated', session: sess });

          res.writeHead(200, {'Content-Type': 'application/json'});
          res.end(JSON.stringify({
            data: {
              id: userMsgId,
              sessionID: sessionId,
              time: userMsg.time,
              type: 'user',
              payload: { text: promptText },
              delivery: 'immediate'
            }
          }));
        });
        return;
      }
      if(req.method === 'GET' && req.url.includes('/message')){
        const msgs = sessionMessages.get(sessionId) || [];
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
          data: msgs,
          cursor: { previous: null, next: null }
        }));
        return;
      }
      if(req.method === 'PATCH'){
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          const sess = localSessions.get(sessionId);
          if (sess) {
            try {
              const parsed = JSON.parse(body);
              if (parsed.title) sess.title = parsed.title;
              if (parsed.archived !== undefined) sess.time.archived = parsed.archived ? Date.now() : undefined;
              sess.time.updated = Date.now();
              localSessions.set(sessionId, sess);
              broadcastSse({ type: 'session.updated', session: sess });
            } catch {}
          }
          res.writeHead(204).end();
        });
        return;
      }
      if(req.method === 'DELETE'){
        localSessions.delete(sessionId);
        sessionMessages.delete(sessionId);
        broadcastSse({ type: 'session.deleted', sessionID: sessionId });
        res.writeHead(204).end();
        return;
      }
      if(req.method === 'GET'){
        const sess = localSessions.get(sessionId) || createSessionObj(sessionId, 'Session');
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({ data: sess }));
        return;
      }
    }

    // OpenCode server info & health probe
    if(req.url === '/api/info' || req.url.startsWith('/api/info?')){
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        version: '1.0.0',
        pid: process.pid,
        hostname: 'localhost',
        urls: [origin],
        paths: {
          tmp: require('node:os').tmpdir()
        }
      }));
      return;
    }

    // OpenCode pairing
    if(req.url === '/api/pair' || req.url.startsWith('/api/pair?')){
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        code: 'local',
        expires_in: 86400
      }));
      return;
    }

    // Other API calls forwarded upstream to Sirona backend
    if(req.url.startsWith('/api/') || req.url.startsWith('/api/v1/')){
      let upstreamPath = req.url;
      const upstream=request({hostname:'127.0.0.1',port:8000,path:upstreamPath,method:req.method,headers:{...req.headers,host:'127.0.0.1:8000'},timeout:180000},reply=>{res.writeHead(reply.statusCode??502,reply.headers);reply.pipe(res);});
      upstream.on('error',()=>{if(!res.headersSent)res.writeHead(503,{'Content-Type':'application/problem+json'});res.end(JSON.stringify({status:503,detail:'The Sirona backend is unavailable.'}));});upstream.on('timeout',()=>upstream.destroy());req.on('aborted',()=>upstream.destroy());res.on('close',()=>upstream.destroy());req.pipe(upstream);return;
    }
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  try{
    const pathname=new URL(req.url,origin).pathname;
    let file=resolve(root,`.${pathname==='/'?'/index.html':decodeURIComponent(pathname)}`);
    if(!file.startsWith(root+sep)&&file!==resolve(root,'index.html')){res.writeHead(403).end();return;}
    let fileToRead=file;
    try {
      const fileStat = await stat(fileToRead);
      if(fileStat.isDirectory()) fileToRead=resolve(root,'index.html');
    } catch {
      fileToRead=resolve(root,'index.html');
    }
    const value=await readFile(fileToRead);
    const mimeTypes = {
      '.html':'text/html',
      '.js':'text/javascript',
      '.css':'text/css',
      '.woff2':'font/woff2',
      '.woff':'font/woff',
      '.ttf':'font/ttf',
      '.png':'image/png',
      '.svg':'image/svg+xml',
      '.json':'application/json',
      '.ico':'image/x-icon',
      '.wasm':'application/wasm'
    };
    res.writeHead(200,{
      'Content-Type': mimeTypes[extname(fileToRead)]??'application/octet-stream',
      'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy':"default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: http: ws:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' http: ws:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'"
    });
    res.end(req.method==='HEAD'?undefined:value);
  }catch{
    res.writeHead(404).end();
  }
});listener.closeTerminalChannels=attachTerminalProxy(listener,{port,origin});return listener;}

if (require.main === module) {
  const s = server();
  s.listen(port, '127.0.0.1', () => {
    console.log(`[Sirona] Web UI server listening at ${origin}`);
  });
}

module.exports = { server, port, origin };
