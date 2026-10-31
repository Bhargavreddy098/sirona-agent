const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-detailed/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Strip ALL explicit routing first
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
}

// ONLY fix the specific problematic connections with explicit routing
// 1. api-gateway -> all managers: route RIGHT then DOWN past row 2, then to targets
const ag = comps['api-gateway'];
const agRight = ag.pos[0] + ag.size[0];
const agCenterY = cy('api-gateway');
const goDownY = ag.pos[1] + ag.size[1] + 300; // well below row 2

const managerTargets = ['session-manager', 'project-manager', 'workspace-manager', 'conversation-manager', 'run-manager', 'event-stream'];

for (const target of managerTargets) {
  for (const c of d.connections) {
    if (c.from === 'api-gateway' && c.to === target) {
      const t = comps[target];
      if (t) {
        c.fromSide = 'right';
        c.toSide = 'top';
        c.via = [
          [agRight + 20, agCenterY],
          [agRight + 20, goDownY],
          [cx(target), goDownY],
          [cx(target), t.pos[1] - 10]
        ];
      }
      break;
    }
  }
}

// 2. worker-adapters -> verification-engine: go LEFT then DOWN
for (const c of d.connections) {
  if (c.from === 'worker-adapters' && c.to === 'verification-engine') {
    const wa = comps['worker-adapters'];
    const ve = comps['verification-engine'];
    if (wa && ve) {
      c.fromSide = 'left';
      c.toSide = 'right';
      c.via = [
        [wa.pos[0] - 30, cy('worker-adapters')],
        [wa.pos[0] - 30, ve.pos[1] + ve.size[1] / 2],
        [ve.pos[0] + ve.size[0] + 30, ve.pos[1] + ve.size[1] / 2]
      ];
    }
  }
}

// 3. context-retrieval -> memory-platform: go LEFT then DOWN
for (const c of d.connections) {
  if (c.from === 'context-retrieval' && c.to === 'memory-platform') {
    const cr = comps['context-retrieval'];
    const mp = comps['memory-platform'];
    if (cr && mp) {
      c.fromSide = 'left';
      c.toSide = 'right';
      c.via = [
        [cr.pos[0] - 30, cy('context-retrieval')],
        [cr.pos[0] - 30, mp.pos[1] + mp.size[1] / 2],
        [mp.pos[0] + mp.size[0] + 30, mp.pos[1] + mp.size[1] / 2]
      ];
    }
  }
}

// All other connections (including all engine->orchestrator) use AUTO routing
// Do NOT add explicit routing for them

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Only fixed the 3 problematic connection groups; all others use auto routing');