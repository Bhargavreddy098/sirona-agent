const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Strip ALL explicit routing first
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
}

// Route ALL api-gateway connections to go RIGHT first (from right side), then down past row 2, then to targets
// This avoids crossing row 2 components (repo-scanner, file-index, etc. at col 0-3)

const targets = ['session-manager', 'project-manager', 'workspace-manager', 'conversation-manager', 'run-manager', 'event-stream'];

// Stagger the Y positions where they go down
const staggerY = [40, 80, 120, 160, 200, 240];

// api-gateway right edge
const agRight = comps['api-gateway'].pos[0] + comps['api-gateway'].size[0];

for (let i = 0; i < targets.length; i++) {
  const target = targets[i];
  const offsetY = staggerY[i];
  for (const c of d.connections) {
    if (c.from === 'api-gateway' && c.to === target) {
      const t = comps[target];
      if (t) {
        c.fromSide = 'right';
        c.toSide = 'top';
        const goDownY = comps['api-gateway'].pos[1] + comps['api-gateway'].size[1] + offsetY; // ~300 + offset
        c.via = [
          [agRight + 20, cy('api-gateway')],  // right from api-gateway
          [agRight + 20, goDownY],             // down past row 2
          [cx(target), goDownY],               // horizontal to target column
          [cx(target), t.pos[1] - 10]          // down to target
        ];
      }
      break;
    }
  }
}

// Also fix context-retrieval -> memory-platform to go around git-intelligence
for (const c of d.connections) {
  if (c.from === 'context-retrieval' && c.to === 'memory-platform') {
    const cr = comps['context-retrieval'];
    const mp = comps['memory-platform'];
    const gi = comps['git-intelligence'];
    if (cr && mp && gi) {
      c.fromSide = 'right';
      c.toSide = 'left';
      c.via = [
        [cr.pos[0] + cr.size[0] + 30, cy('context-retrieval')],
        [cr.pos[0] + cr.size[0] + 30, mp.pos[1] + mp.size[1] / 2],
        [mp.pos[0] - 30, mp.pos[1] + mp.size[1] / 2]
      ];
    }
  }
}

// Separate the Intelligence Plane engines to orchestrator - use distinct lanes
const rightEngines = ['planning-engine', 'architecture-engine', 'decision-engine', 'context-engine', 'build-contract-engine'];
const rightLanes = [-80, -40, 0, 40, 80];

for (let i = 0; i < rightEngines.length; i++) {
  const engine = rightEngines[i];
  const lane = rightLanes[i];
  for (const c of d.connections) {
    if (c.from === engine && c.to === 'orchestrator') {
      const fromComp = comps[engine];
      const toComp = comps['orchestrator'];
      if (fromComp && toComp) {
        c.fromSide = 'right';
        c.toSide = 'left';
        const midX = (fromComp.pos[0] + fromComp.size[0] + toComp.pos[0]) / 2;
        c.via = [
          [fromComp.pos[0] + fromComp.size[0] + 15, cy(engine)],
          [midX, cy(engine)],
          [midX, cy('orchestrator') + lane],
          [toComp.pos[0] - 15, cy('orchestrator') + lane]
        ];
      }
      break;
    }
  }
}

// Top engines (intent, requirements, research) - go down then right
const topEngines = ['intent-engine', 'requirements-engine', 'research-engine'];
const topLanes = [-60, -20, 20];

for (let i = 0; i < topEngines.length; i++) {
  const engine = topEngines[i];
  const lane = topLanes[i];
  for (const c of d.connections) {
    if (c.from === engine && c.to === 'orchestrator') {
      const fromComp = comps[engine];
      const toComp = comps['orchestrator'];
      if (fromComp && toComp) {
        c.fromSide = 'bottom';
        c.toSide = 'top';
        c.via = [
          [cx(engine), fromComp.pos[1] + fromComp.size[1] + 20],
          [cx(engine), toComp.pos[1] + lane],
          [cx('orchestrator'), toComp.pos[1] + lane],
          [cx('orchestrator'), toComp.pos[1] - 15]
        ];
      }
      break;
    }
  }
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Completely re-routed with right-exit for api-gateway and separated lanes');