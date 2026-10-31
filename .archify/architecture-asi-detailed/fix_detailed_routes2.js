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

// Fix api-gateway -> all managers: route RIGHT first, then DOWN past row 2, then LEFT to targets
// api-gateway is at col 0, row 1. The managers are at row 1, cols 1-6.
// Row 2 components are at y=440+ area. We need to go right, then down well below row 2.

const ag = comps['api-gateway'];
const agRight = ag.pos[0] + ag.size[0]; // right edge of api-gateway
const agCenterY = cy('api-gateway');

// Go down to well below row 2 (which ends around y=500+)
const goDownY = ag.pos[1] + ag.size[1] + 300; // ~300+300 = 600, well below row 2

const managerTargets = ['session-manager', 'project-manager', 'workspace-manager', 'conversation-manager', 'run-manager', 'event-stream'];

for (const target of managerTargets) {
  for (const c of d.connections) {
    if (c.from === 'api-gateway' && c.to === target) {
      const t = comps[target];
      if (t) {
        c.fromSide = 'right';
        c.toSide = 'top';
        c.via = [
          [agRight + 20, agCenterY],           // right from api-gateway
          [agRight + 20, goDownY],              // down past all row 2 components
          [cx(target), goDownY],                // horizontal to target column
          [cx(target), t.pos[1] - 10]           // down to target
        ];
      }
      break;
    }
  }
}

// Fix worker-adapters -> verification-engine: go LEFT then DOWN (avoiding tool-runtime)
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

// Fix context-retrieval -> memory-platform: go LEFT then DOWN (avoiding git-intelligence)
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

// Separate the right-side engines to orchestrator with distinct lanes
// Use fewer via points - just one bend
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
        // Simple L-shape: right from source, then down/up to orchestrator level, then left to target
        c.via = [
          [fromComp.pos[0] + fromComp.size[0] + 15, cy(engine)],
          [toComp.pos[0] - 15, cy(engine)],
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
console.log('Fixed: api-gateway routes RIGHT then DOWN; simplified right-engine routes');