const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const origin = [40, 40], cellW = 190, cellH = 74, gapX = 40, gapY = 50;
for (const c of d.components) {
  if (!c.pos && c.row != null) {
    c.pos = [origin[0] + c.col * (cellW + gapX), origin[1] + c.row * (cellH + gapY)];
  }
  delete c.row; delete c.col;
}
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id].pos[0] + comps[id].size[0] / 2;
const cy = id => comps[id].pos[1] + comps[id].size[1] / 2;
const conns = [];
const add = o => conns.push(o);
add({ from: 'electron-desktop', to: 'api-gateway', label: 'HTTPS / SSE', variant: 'emphasis' });
add({ from: 'cli-tui', to: 'api-gateway', label: 'HTTPS / SSE', variant: 'emphasis' });
for (const t of ['session-manager','project-manager','workspace-manager','conversation-manager','run-manager','event-stream']) {
  add({ from: 'api-gateway', to: t, variant: 'default', fromSide: 'top', toSide: 'top', via: [[115, 155], [cx(t), 155]] });
}
add({ from: 'workspace-manager', to: 'repo-scanner', label: 'workspace path', variant: 'default' });
for (const src of ['repo-scanner','file-index','code-intelligence','git-intelligence']) add({ from: src, to: 'project-knowledge-graph', variant: 'default' });
add({ from: 'project-knowledge-graph', to: 'context-retrieval', variant: 'default' });
add({ from: 'context-retrieval', to: 'context-engine', label: 'context packs', variant: 'emphasis', fromSide: 'right', toSide: 'left', via: [[cx('context-retrieval')+20, cy('context-retrieval')], [cx('context-retrieval')+20, 340], [cx('context-engine')-20, 340], [cx('context-engine')-20, cy('context-engine')]] });
for (const src of ['intent-engine','requirements-engine','research-engine','planning-engine','architecture-engine','decision-engine','context-engine','build-contract-engine']) {
  const x = cx(src);
  add({ from: src, to: 'orchestrator', variant: 'default', fromSide: 'bottom', toSide: 'top', via: [[x, 395], [x, 420]] });
}
add({ from: 'orchestrator', to: 'dynamic-agent-engine', label: 'creates agents', variant: 'emphasis' });
add({ from: 'orchestrator', to: 'model-router', label: 'model selection', variant: 'emphasis' });
add({ from: 'orchestrator', to: 'task-runtime', label: 'dispatch tasks', variant: 'emphasis' });
add({ from: 'orchestrator', to: 'workflow-runtime', label: 'durable state', variant: 'default' });
add({ from: 'orchestrator', to: 'memory-platform', label: 'read / write', variant: 'default' });
add({ from: 'model-router', to: 'provider-adapters', label: 'dispatch', variant: 'emphasis' });
add({ from: 'provider-registry', to: 'provider-adapters', variant: 'default' });
add({ from: 'provider-adapters', to: 'ext-model-providers', label: 'API calls', variant: 'dashed' });
add({ from: 'provider-adapters', to: 'local-model-endpoints', label: 'local calls', variant: 'dashed' });
add({ from: 'task-runtime', to: 'tool-runtime', variant: 'default' });
add({ from: 'task-runtime', to: 'worker-adapters', variant: 'default' });
add({ from: 'tool-runtime', to: 'policy-security', label: 'authorize', variant: 'security' });
add({ from: 'policy-security', to: 'sandbox-manager', label: 'scoped caps', variant: 'security' });
add({ from: 'sandbox-manager', to: 'execution-runtimes', label: 'contained exec', variant: 'security' });
add({ from: 'worker-adapters', to: 'ext-coding-workers', label: 'delegate', variant: 'dashed' });
add({ from: 'execution-runtimes', to: 'verification-engine', label: 'results / artifacts', variant: 'emphasis' });
add({ from: 'worker-adapters', to: 'verification-engine', label: 'diffs / logs', variant: 'emphasis' });
add({ from: 'verification-engine', to: 'orchestrator', label: 'PASS / FAIL / UNKNOWN', variant: 'emphasis' });
add({ from: 'verification-engine', to: 'self-repair', label: 'failures', variant: 'dashed' });
add({ from: 'self-repair', to: 'orchestrator', label: 'repair tasks', variant: 'dashed' });
add({ from: 'workflow-runtime', to: 'data-plane', label: 'persist', variant: 'default' });
add({ from: 'memory-platform', to: 'data-plane', label: 'pgvector retrieval', variant: 'default' });
add({ from: 'context-retrieval', to: 'memory-platform', label: 'semantic recall', variant: 'default' });
add({ from: 'observability', to: 'data-plane', label: 'audit / traces', variant: 'dashed' });
d.connections = conns;
if (d.layout) delete d.layout;
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('rewrote connections', conns.length);
