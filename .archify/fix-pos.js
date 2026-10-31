const fs = require('fs');
const p = 'C:/Users/bharg/OneDrive/Desktop/personal -agent/.archify/architecture-asi-platform-20261027-120000/candidate.json';
const d = JSON.parse(fs.readFileSync(p, 'utf8'));
const posMap = {
  "user": [200, 100],
  "desktop": [200, 250],
  "cli": [200, 400],
  "workspace": [600, 100],
  "gateway": [600, 250],
  "intelligence": [600, 400],
  "intent": [600, 500],
  "planning": [600, 600],
  "orchestrator": [600, 750],
  "router": [1000, 200],
  "agents": [1000, 300],
  "tools": [1000, 400],
  "sandbox": [1000, 500],
  "verification": [1000, 600],
  "artifacts": [1000, 700],
  "postgres": [600, 900],
  "redis": [800, 900],
  "memory": [400, 900],
  "observability": [800, 950],
  "providers": [1400, 200],
  "workers": [1400, 300],
  "external": [1400, 400]
};
d.components.forEach(c => {
  if (posMap[c.id]) {
    c.pos = posMap[c.id];
    c.size = [160, 60];
  }
});
fs.writeFileSync(p, JSON.stringify(d, null, 2));
console.log('added pos and size');