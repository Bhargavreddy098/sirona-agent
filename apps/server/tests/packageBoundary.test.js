import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
import {inspectNpmPayload} from '../scripts/checkPackageBoundary.mjs';

test('real npm packaging excludes nested secret/configuration/database artifacts and keeps the example',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'sirona-package-boundary-'));
 assert.equal(path.dirname(path.resolve(root)),path.resolve(os.tmpdir()));assert.match(path.basename(root),/^sirona-package-boundary-/);
 try{await fs.writeFile(path.join(root,'package.json'),JSON.stringify({name:'sirona-package-boundary-test',version:'1.0.0',private:true}));await fs.copyFile(fileURLToPath(new URL('../.npmignore',import.meta.url)),path.join(root,'.npmignore'));
  for(const name of ['index.js','.env','.env.local','.env.example','nested/.env','nested/.env.production','nested/.env.example','keys/private.pem','data/sirona.db','data/sirona.db-wal','scratch/internal.txt','backend.zip']){await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});await fs.writeFile(path.join(root,name),'packaging canary; not a real credential');}
  const payload=inspectNpmPayload(root);assert.deepEqual(payload.violations,[]);assert.ok(payload.files.includes('index.js'));assert.ok(payload.files.includes('.env.example'));assert.ok(payload.files.includes('nested/.env.example'));
  for(const name of ['.env','.env.local','nested/.env','nested/.env.production','keys/private.pem','data/sirona.db','data/sirona.db-wal','scratch/internal.txt','backend.zip'])assert.ok(!payload.files.includes(name),'Unexpected packaged private file: '+name);
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
test('the actual backend npm payload contains no prohibited local configuration or database files',()=>{assert.deepEqual(inspectNpmPayload(fileURLToPath(new URL('../',import.meta.url))).violations,[]);});
