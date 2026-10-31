const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-detailed/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// First: convert grid layout to explicit positions
if (d.layout && d.layout.mode === 'grid') {
  const L = d.layout;
  for (const c of d.components) {
    if (c.row != null && c.col != null) {
      c.pos = [
        L.origin[0] + c.col * (L.cellW + L.gapX),
        L.origin[1] + c.row * (L.cellH + L.gapY)
      ];
      delete c.row; delete c.col;
    }
  }
  delete d.layout;
}

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Strip ALL explicit routing first
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
}

// Fix api-gateway -> all managers: route DOWN first, then right
const managerTargets = ['session-manager', 'project-manager', 'workspace-manager', 'conversation-manager', 'run-manager', 'event-stream'];
const offsets = [40, 80, 120, 160, 200, 240];

for (let i = 0; i < managerTargets.length; i++) {
  const target = managerTargets[i];
  const offsetY = offsets[i];
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
      break;
    }
  }
}

// Fix worker-adapters -> verification-engine: go LEFT then DOWN (avoiding tool-runtime)
for (const c of d.connections) {
  if (c.from === 'worker-adapters' && c.to === 'verification-engine') {
    const wa = comps['worker-adapters'];
    const ve = comps['verification-engine'];
    const tr = comps['tool-runtime'];
    if (wa && ve && tr) {
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
    const gi = comps['git-intelligence'];
    if (cr && mp && gi) {
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
console.log('Converted grid to explicit positions and added routing');