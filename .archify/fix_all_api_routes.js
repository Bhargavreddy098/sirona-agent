const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Add explicit routing for ALL api-gateway connections to go DOWN into the region first
// The region "Trusted Local Backend" has its top border at y=208 (region pad=20, api-gateway at y=240, size=60, so bottom at 300, region top = 240-20=220?)
// Actually region wraps everything with pad=20, so top border is at api-gateway.pos[1] - 20 = 220
// We need connections to go DOWN from api-gateway (y=300) into the region, then horizontally

const targets = ['session-manager', 'project-manager', 'workspace-manager', 'conversation-manager', 'run-manager', 'event-stream'];
// Stagger the Y positions so they don't overlap
const staggerY = [40, 80, 120, 160, 200, 240];

for (let i = 0; i < targets.length; i++) {
  const target = targets[i];
  const offsetY = staggerY[i];
  for (const c of d.connections) {
    if (c.from === 'api-gateway' && c.to === target) {
      const ag = comps['api-gateway'];
      const t = comps[target];
      if (ag && t) {
        c.fromSide = 'bottom';
        c.toSide = 'top';
        c.via = [
          [cx('api-gateway'), ag.pos[1] + ag.size[1] + offsetY],
          [cx(target), ag.pos[1] + ag.size[1] + offsetY],
          [cx(target), t.pos[1] - 10]
        ];
      }
      break; // Only first match
    }
  }
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Added staggered routing for all api-gateway connections');