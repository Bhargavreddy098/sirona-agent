const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p,'utf8'));
// Remove layout, keep pos, strip connection routing (already none)
if (d.layout) delete d.layout;
fs.writeFileSync(p, JSON.stringify(d,null,2));
console.log('ok');
"