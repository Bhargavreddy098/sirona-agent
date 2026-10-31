const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Add minimal explicit routing ONLY for api-gateway -> workspace-manager to avoid boundary border
for (const c of d.connections) {
  if (c.from === 'api-gateway' && c.to === 'workspace-manager') {
    const ag = comps['api-gateway'];
    const wm = comps['workspace-manager'];
    if (ag && wm) {
      c.fromSide = 'bottom';
      c.toSide = 'top';
      c.via = [
        [cx('api-gateway'), ag.pos[1] + ag.size[1] + 30],
        [cx('workspace-manager'), ag.pos[1] + ag.size[1] + 30],
        [cx('workspace-manager'), wm.pos[1] - 10]
      ];
    }
  }
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Added minimal routing for api-gateway -> workspace-manager');