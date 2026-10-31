const fs = require('fs');
const path = '.archify/architecture-asi-platform-20261027-120000/candidate.json';
let d = JSON.parse(fs.readFileSync(path, 'utf8'));
let c = d.connections.find(x => x.id === 'c-intel-mem');
if (c) {
  c.via = [[650, 260], [650, 60], [2150, 60], [2150, 700], [1200, 700]];
  fs.writeFileSync(path, JSON.stringify(d, null, 2));
  console.log('Updated c-intel-mem via path');
} else {
  console.log('Could not find c-intel-mem');
}