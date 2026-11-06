import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {applyNativePatch} from '../src/workspace/nativePatch.js';
import {WorkspaceBroker,type WorkspacePatch} from '../src/workspace/workspaceBroker.js';
const hash=(value:string)=>crypto.createHash('sha256').update(value).digest('hex');
function fixture(t:any){const root=fs.mkdtempSync(path.join(os.tmpdir(),'sirona-native-'));t.after(()=>{const relative=path.relative(os.tmpdir(),root);assert.ok(!relative.startsWith('..')&&path.basename(root).startsWith('sirona-native-'));fs.rmSync(root,{recursive:true,force:true});});return root;}
function modify(name:string,old:string,next:string):WorkspacePatch{return{added:[],deleted:[],modified:[{path:name,oldSha256:hash(old),newSha256:hash(next),content:Buffer.from(next)}],patchDigest:hash('native component test')};}

test('P3 actual Windows helper changes files only when all locked preimages match',async t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'a.txt'),'base');fs.writeFileSync(path.join(root,'b.txt'),'user edit');
 const patch=modify('a.txt','base','proposal');patch.modified.push(modify('b.txt','base','proposal').modified[0]!);
 assert.equal(applyNativePatch(root,patch).status,'unknown');assert.equal(fs.readFileSync(path.join(root,'a.txt'),'utf8'),'base');assert.equal(fs.readFileSync(path.join(root,'b.txt'),'utf8'),'user edit');
 fs.writeFileSync(path.join(root,'b.txt'),'base');assert.equal(applyNativePatch(root,patch).status,'completed');assert.equal(fs.readFileSync(path.join(root,'a.txt'),'utf8'),'proposal');
});

test('P3 Windows helper refuses a hardlink without modifying either name',async t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'a.txt'),'base');fs.linkSync(path.join(root,'a.txt'),path.join(root,'alias.txt'));
 assert.equal(applyNativePatch(root,modify('a.txt','base','proposal')).status,'unknown');assert.equal(fs.readFileSync(path.join(root,'alias.txt'),'utf8'),'base');
});

test('P3 Windows helper rejects junction traversal; target bytes stay unchanged',async t=>{
 const root=fixture(t),outside=fixture(t);fs.writeFileSync(path.join(outside,'safe.txt'),'base');fs.symlinkSync(outside,path.join(root,'linked'),'junction');
 assert.equal(applyNativePatch(root,modify('linked/safe.txt','base','proposal')).status,'unknown');assert.equal(fs.readFileSync(path.join(outside,'safe.txt'),'utf8'),'base');
 // Remove this test-owned junction explicitly before recursive fixture cleanup.
 fs.rmdirSync(path.join(root,'linked'));
});

test('P3 native addition preserves an existing concurrent file',async t=>{
 const root=fixture(t);fs.writeFileSync(path.join(root,'new.txt'),'user bytes');
 const patch:WorkspacePatch={added:[{path:'new.txt',sha256:hash('guest'),content:Buffer.from('guest')}],modified:[],deleted:[],patchDigest:hash('addition')};
 assert.equal(applyNativePatch(root,patch).status,'unknown');assert.equal(fs.readFileSync(path.join(root,'new.txt'),'utf8'),'user bytes');
 assert.throws(()=>WorkspaceBroker.sanitizeRelativePath('new.txt:stream'));
});
