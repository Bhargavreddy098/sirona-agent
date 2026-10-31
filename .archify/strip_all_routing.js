const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));

// Strip ALL explicit routing - let auto-router handle it
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route;
  delete c.labelAt; delete c.labelDx; delete c.labelDy; delete c.labelSegment;
}

// Keep grid layout with generous spacing - don't convert to pos
// The grid layout with gapX:80, gapY:100, cellW:240, cellH:100 should be enough

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Stripped all explicit routing, kept grid layout with generous spacing');