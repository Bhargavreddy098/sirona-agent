const fs=require('node:fs');
const file='backend/services/executionService.js';let text=fs.readFileSync(file,'utf8');const old="AND ($2::uuid IS NULL OR id=$2) AND attempt < max_attempts AND (state IN ('pending', 'queued') OR ($3::boolean";
const value="AND ($2::uuid IS NULL OR id=$2) AND (($3::boolean AND step_key LIKE 'ui:terminal:%') OR (NOT $3::boolean AND step_key NOT LIKE 'ui:terminal:%')) AND attempt < max_attempts AND (state IN ('pending', 'queued') OR ($3::boolean";
if(!text.includes(old))throw new Error('Reservation query changed');fs.writeFileSync(file,text.replace(old,value));
