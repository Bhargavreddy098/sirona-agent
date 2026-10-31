const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-platform-20261027-120000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const SHIFT = 400;
const THRESHOLD = 1490;

d.components.forEach(c => {
  if (c.pos && c.pos[0] >= THRESHOLD) {
    c.pos[0] -= SHIFT;
  }
});

// Shift via points
d.connections.forEach(conn => {
  if (conn.via) {
    conn.via = conn.via.map(pt => {
      if (pt[0] >= THRESHOLD) return [pt[0] - SHIFT, pt[1]];
      return pt;
    });
  }
});

fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('Shifted right-side nodes left by', SHIFT);