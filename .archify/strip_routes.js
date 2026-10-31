const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
for (const c of d.connections) {
  delete c.fromSide; delete c.toSide; delete c.via; delete c.route; delete c.labelAt; delete c.labelDx; delete c.labelDy; delete c.labelSegment;
}
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('stripped routes; connections:', d.connections.length);
