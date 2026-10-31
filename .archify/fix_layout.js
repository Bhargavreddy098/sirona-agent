const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Increase grid spacing significantly
if (d.layout) {
  d.layout.gapX = 80;
  d.layout.gapY = 100;
  d.layout.cellW = 240;
  d.layout.cellH = 100;
}

// Recompute positions from grid
const L = d.layout;
for (const c of d.components) {
  if (c.row != null && c.col != null) {
    c.pos = [L.origin[0] + c.col * (L.cellW + L.gapX), L.origin[1] + c.row * (L.cellH + L.gapY)];
    delete c.row; delete c.col;
  }
}

// Build component lookup
const comps = Object.fromEntries(d.components.map(c => [c.id, c]));
const cx = id => comps[id]?.pos ? comps[id].pos[0] + comps[id].size[0] / 2 : 0;
const cy = id => comps[id]?.pos ? comps[id].pos[1] + comps[id].size[1] / 2 : 0;

// Add explicit routing for api-gateway -> run-manager (go down then right)
for (const c of d.connections) {
  if (c.from === 'api-gateway' && c.to === 'run-manager') {
    c.fromSide = 'bottom';
    c.toSide = 'top';
    // Route down from api-gateway, then right to run-manager
    const ag = comps['api-gateway'];
    const rm = comps['run-manager'];
    if (ag && rm) {
      c.via = [
        [cx('api-gateway'), ag.pos[1] + ag.size[1] + 20],
        [cx('run-manager'), ag.pos[1] + ag.size[1] + 20],
        [cx('run-manager'), rm.pos[1] - 20]
      ];
    }
  }
  if (c.from === 'api-gateway' && c.to === 'event-stream') {
    c.fromSide = 'bottom';
    c.toSide = 'top';
    const ag = comps['api-gateway'];
    const es = comps['event-stream'];
    if (ag && es) {
      c.via = [
        [cx('api-gateway'), ag.pos[1] + ag.size[1] + 60],
        [cx('event-stream'), ag.pos[1] + ag.size[1] + 60],
        [cx('event-stream'), es.pos[1] - 20]
      ];
    }
  }
  if (c.from === 'api-gateway' && ['session-manager','project-manager','workspace-manager','conversation-manager'].includes(c.to)) {
    // These go straight down - shorter route
    c.fromSide = 'bottom';
    c.toSide = 'top';
    const ag = comps['api-gateway'];
    const target = comps[c.to];
    if (ag && target) {
      c.via = [
        [cx('api-gateway'), ag.pos[1] + ag.size[1] + 10],
        [cx(c.to), ag.pos[1] + ag.size[1] + 10],
        [cx(c.to), target.pos[1] - 10]
      ];
    }
  }
}

// Route context-retrieval -> memory-platform around git-intelligence
for (const c of d.connections) {
  if (c.from === 'context-retrieval' && c.to === 'memory-platform') {
    const cr = comps['context-retrieval'];
    const mp = comps['memory-platform'];
    const gi = comps['git-intelligence'];
    if (cr && mp && gi) {
      // Route right from context-retrieval, then down, then left to memory-platform
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

// Separate the Intelligence Plane engines to orchestrator connections
// planning-engine, architecture-engine, decision-engine, context-engine, build-contract-engine all go to orchestrator
// Give them different vertical lanes
const engineLanes = {
  'planning-engine': -60,
  'architecture-engine': -30,
  'decision-engine': 0,
  'context-engine': 30,
  'build-contract-engine': 60
};

for (const c of d.connections) {
  if (['planning-engine','architecture-engine','decision-engine','context-engine','build-contract-engine'].includes(c.from) && c.to === 'orchestrator') {
    const lane = engineLanes[c.from] || 0;
    const fromComp = comps[c.from];
    const toComp = comps['orchestrator'];
    if (fromComp && toComp) {
      c.fromSide = 'right';
      c.toSide = 'left';
      const midX = (fromComp.pos[0] + fromComp.size[0] + toComp.pos[0]) / 2;
      c.via = [
        [fromComp.pos[0] + fromComp.size[0] + 15, cy(c.from)],
        [midX, cy(c.from)],
        [midX, cy('orchestrator') + lane],
        [toComp.pos[0] - 15, cy('orchestrator') + lane]
      ];
    }
  }
}

// Separate the intent/requirements/research engines to orchestrator
const topEngineLanes = {
  'intent-engine': -60,
  'requirements-engine': -30,
  'research-engine': 0
};

for (const c of d.connections) {
  if (['intent-engine','requirements-engine','research-engine'].includes(c.from) && c.to === 'orchestrator') {
    const lane = topEngineLanes[c.from] || 0;
    const fromComp = comps[c.from];
    const toComp = comps['orchestrator'];
    if (fromComp && toComp) {
      c.fromSide = 'bottom';
      c.toSide = 'top';
      const midY = (fromComp.pos[1] + fromComp.size[1] + toComp.pos[1]) / 2;
      c.via = [
        [cx(c.from), fromComp.pos[1] + fromComp.size[1] + 15],
        [cx(c.from), midY + lane],
        [cx('orchestrator'), midY + lane],
        [cx('orchestrator'), toComp.pos[1] - 15]
      ];
    }
  }
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Layout fixed with increased spacing and explicit routing');