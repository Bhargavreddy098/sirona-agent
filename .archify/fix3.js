const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
if (d.layout && d.layout.mode === 'grid') {
  const L = d.layout;
  for (const c of d.components) {
    if (c.row != null) {
      c.pos = [L.origin[0] + c.col * (L.cellW + L.gapX), L.origin[1] + c.row * (L.cellH + L.gapY)];
      delete c.row; delete c.col;
    }
  }
  delete d.layout;
}
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id].pos[0] + comps[id].size[0] / 2;
const cy = id => comps[id].pos[1] + comps[id].size[1] / 2;
const ag = comps['api-gateway'];
ag.pos = [600, 150];
for (const c of d.connections) {
  if (c.from === 'api-gateway' && ['session-manager','project-manager','workspace-manager','conversation-manager','run-manager','event-stream'].includes(c.to)) {
    const tx = cx(c.to);
    c.fromSide = 'top'; c.toSide = 'top';
    c.via = [[cx('api-gateway'), 120], [tx, 120]];
  }
}
const cr = comps['context-retrieval'];
const mp = comps['memory-platform'];
const via = [[cr.pos[0] + cr.size[0] + 15, cy('context-retrieval')],
             [cr.pos[0] + cr.size[0] + 15, cy('memory-platform')],
             [mp.pos[0] + mp.size[0] + 15, cy('memory-platform')]];
for (const c of d.connections) {
  if (c.from === 'context-retrieval' && c.to === 'memory-platform') {
    c.fromSide = 'right'; c.toSide = 'right'; c.via = via;
  }
}
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('done');
