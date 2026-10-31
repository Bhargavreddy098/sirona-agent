const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Remove grid layout - use explicit positions
delete d.layout;

// Reposition all components with EXPLICIT positions and generous spacing
// This gives us full control over placement

const positions = {
  // Row 0: Clients (y=40)
  'electron-desktop': [40, 40],
  'cli-tui': [280, 40],
  'future-web': [500, 40],

  // Row 1: Local Control Plane (y=180)
  'api-gateway': [40, 180],
  'session-manager': [260, 180],
  'project-manager': [480, 180],
  'workspace-manager': [700, 180],
  'conversation-manager': [930, 180],
  'run-manager': [1170, 180],
  'event-stream': [1410, 180],

  // Row 2: Project Intelligence (y=360)
  'repo-scanner': [40, 360],
  'file-index': [260, 360],
  'code-intelligence': [480, 360],
  'git-intelligence': [700, 360],
  'project-knowledge-graph': [930, 360],
  'context-retrieval': [1170, 360],

  // Row 3: Intelligence Plane Engines (y=540)
  'intent-engine': [40, 540],
  'requirements-engine': [240, 540],
  'research-engine': [460, 540],
  'planning-engine': [680, 540],
  'architecture-engine': [900, 540],
  'decision-engine': [1150, 540],
  'context-engine': [1370, 540],
  'build-contract-engine': [1590, 540],

  // Row 4: Core Orchestration (y=740)
  'orchestrator': [680, 740],
  'dynamic-agent-engine': [40, 740],
  'model-router': [1150, 740],

  // Row 5: Model/Execution/Worker (y=920)
  'provider-registry': [40, 920],
  'provider-adapters': [260, 920],
  'task-runtime': [480, 920],
  'tool-runtime': [700, 920],
  'execution-runtimes': [920, 920],
  'worker-adapters': [1200, 920],

  // Row 6: Security/Workflow (y=1100)
  'sandbox-manager': [40, 1100],
  'policy-security': [280, 1100],
  'workflow-runtime': [600, 1100],

  // Row 7: Verification/Repair (y=1280)
  'verification-engine': [40, 1280],
  'self-repair': [380, 1280],

  // Row 8: Data/Memory/Observability (y=1460)
  'memory-platform': [40, 1460],
  'data-plane': [380, 1460],
  'observability': [900, 1460],

  // Row 9: External (y=1640)
  'ext-model-providers': [40, 1640],
  'local-model-endpoints': [300, 1640],
  'ext-coding-workers': [560, 1640],
  'ext-dev-systems': [860, 1640],
};

for (const c of d.components) {
  if (positions[c.id]) {
    c.pos = positions[c.id];
  }
}

// Strip ALL explicit routing - let auto-router handle everything
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
  delete c.labelAt; delete c.labelDx; delete c.labelDy; delete c.labelSegment;
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Switched to explicit positions with generous spacing, stripped all routing');