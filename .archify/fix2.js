const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p,'utf8'));
// Move api-gateway to center of manager row
const ag = d.components.find(c=>c.id==='api-gateway');
ag.pos = [607, 150];
// Route context-retrieval -> memory-platform via right corridor
const cr = d.components.find(c=>c.id==='context-retrieval');
const mp = d.components.find(c=>c.id==='memory-platform');
const via = [[cr.pos[0]+cr.size[0]+20, cr.pos[1]+cr.size[1]/2],
             [cr.pos[0]+cr.size[0]+20, mp.pos[1]+mp.size[1]/2],
             [mp.pos[0]+mp.size[0]+20, mp.pos[1]+mp.size[1]/2]];
for (const c of d.connections) {
  if (c.from==='context-retrieval' && c.to==='memory-platform') {
    c.fromSide='right'; c.toSide='right'; c.via=via;
  }
}
// Route intelligence -> orchestrator via bottom corridor with distinct x offsets (already distinct x)
fs.writeFileSync(p, JSON.stringify(d,null,2));
console.log('done');
