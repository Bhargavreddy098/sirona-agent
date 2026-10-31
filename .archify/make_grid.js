const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-product-20261027-130000/candidate.json';
const d = JSON.parse(fs.readFileSync(p,'utf8'));
// Convert pos back to row/col using a grid, remove pos
const cellW=190, cellH=74, gapX=40, gapY=50, ox=40, oy=40;
for (const c of d.components) {
  if (c.pos) {
    c.col = Math.round((c.pos[0]-ox)/(cellW+gapX));
    c.row = Math.round((c.pos[1]-oy)/(cellH+gapY));
    delete c.pos;
  }
}
// Add grid layout
d.layout = { mode:'grid', origin:[40,40], cols:8, gapX:40, gapY:50, cellW:190, cellH:74 };
fs.writeFileSync(p, JSON.stringify(d,null,2));
console.log('converted to grid');
