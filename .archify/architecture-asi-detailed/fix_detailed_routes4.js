const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-detailed/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Strip ALL explicit routing - go back to pure auto-router
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
}

// Increase grid spacing significantly
if (d.layout && d.layout.mode === 'grid') {
  d.layout.gapX = 100;
  d.layout.gapY = 120;
  d.layout.cellW = 260;
  d.layout.cellH = 100;
}

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Stripped all routing, increased grid spacing for auto-router');