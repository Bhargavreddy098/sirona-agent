const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
// Move api-gateway back to original position
const ag = d.components.find(c => c.id === 'api-gateway');
ag.pos = [40, 150];
// Strip routing from context-retrieval -> memory-platform
for (const c of d.connections) {
  if (c.from === 'context-retrieval' && c.to === 'memory-platform') {
    delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
  }
}
// Strip routing from api-gateway -> managers (let auto route)
for (const c of d.connections) {
  if (c.from === 'api-gateway' && ['session-manager','project-manager','workspace-manager','conversation-manager','run-manager','event-stream'].includes(c.to)) {
    delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
  }
}
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('done');
