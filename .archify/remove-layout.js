const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-platform-20261027-120000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
delete d.layout;
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('removed layout field');
"