import test from 'node:test';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {DockerRuntime} from '../src/windows/dockerRuntime.js';
import {WorkspaceBroker} from '../src/workspace/workspaceBroker.js';
async function fixture(t:any,extra:object={}){const id=await DockerRuntime.createContainer({runId:crypto.randomUUID(),taskId:crypto.randomUUID(),owner:'qualification-only',...extra});t.after(()=>DockerRuntime.removeContainer(id));await DockerRuntime.startContainer(id);return id;}
test('P3 local Linux engine reports cgroup2 and seccomp',async()=>{const health=await DockerRuntime.checkHealth();assert.equal(health.available,true);assert.equal(health.cgroupVersion,2);assert.equal(health.seccompEnabled,true);});
test('P3 worker uses immutable image only; no tag/fallback allowed',async()=>{assert.match(await DockerRuntime.resolveQualifiedImage(),/^sha256:[a-f0-9]{64}$/);await assert.rejects(DockerRuntime.resolveQualifiedImage('alpine:latest'),{code:'IMAGE_NOT_QUALIFIED'});});
test('P3 real container is non-root and capability-dropped',async t=>{const id=await fixture(t);assert.equal((await DockerRuntime.exec(id,['id','-u'])).stdout.trim(),'10001');const status=await DockerRuntime.exec(id,['cat','/proc/self/status']);assert.match(status.stdout,/CapEff:\s+0+/);assert.match(status.stdout,/NoNewPrivs:\s+1/);});
test('P3 rootfs read-only and network has no egress route',async t=>{const id=await fixture(t);assert.notEqual((await DockerRuntime.exec(id,['touch','/etc/forbidden'])).exitCode,0);const route=await DockerRuntime.exec(id,['cat','/proc/net/route']);assert.equal(route.stdout.trim().split('\n').length,1);const network=await DockerRuntime.exec(id,['wget','-T','1','-O','-','http://1.1.1.1'],{timeoutMs:5000});assert.notEqual(network.exitCode,0);});
test('P3 tmpfs hard byte cap returns ENOSPC',async t=>{const id=await fixture(t,{diskLimitMb:10});const result=await DockerRuntime.exec(id,['dd','if=/dev/zero','of=/workspace/full','bs=1048576','count=12']);assert.notEqual(result.exitCode,0);assert.match(result.stderr,/No space left/);});
test('P3 unknown environment names and credential aliases cannot be forwarded',async t=>{const id=await fixture(t,{customEnv:{OPENAI_API_KEY:'canary-secret',SAFE_USER_FLAG:'also-a-secret',CI:'true',PATH:'/malicious'}});const result=await DockerRuntime.exec(id,['env']);assert.doesNotMatch(result.stdout,/canary-secret|also-a-secret|malicious|OPENAI_API_KEY|SAFE_USER_FLAG/);assert.match(result.stdout,/CI=true/);});
test('P3 foreign container IDs cannot be started/executed/stopped/removed',async()=>{const id='0'.repeat(64);for(const operation of [()=>DockerRuntime.startContainer(id),()=>DockerRuntime.exec(id,['id']),()=>DockerRuntime.stopContainer(id),()=>DockerRuntime.removeContainer(id)])await assert.rejects(operation,{code:'CONTAINER_OWNERSHIP_REQUIRED'});});

test('P3 a fresh independent Node container verifies exact produced bytes and rejects a bad artifact',async t=>{
 const producer=await fixture(t);assert.equal((await DockerRuntime.exec(producer,['node','-e',"require('fs').writeFileSync('/workspace/result.txt','verified result')"])).exitCode,0);
 const snapshot=await WorkspaceBroker.importSnapshotFromContainer(producer),artifact=snapshot.entries.get('result.txt');assert.ok(artifact);
 const verifier=await fixture(t);assert.notEqual(verifier,producer);await DockerRuntime.writeArchive(verifier,WorkspaceBroker.packSnapshotToTar(snapshot));
 const verify="const fs=require('fs'),crypto=require('crypto'),assert=require('assert/strict');assert.equal(crypto.createHash('sha256').update(fs.readFileSync('result.txt')).digest('hex'),process.argv[1]);console.log('INDEPENDENT_VERIFICATION_PASS')";
 const passed=await DockerRuntime.exec(verifier,['node','-e',verify,artifact.sha256]);assert.equal(passed.exitCode,0);assert.match(passed.stdout,/INDEPENDENT_VERIFICATION_PASS/);
 const rejected=await DockerRuntime.exec(verifier,['node','-e',verify,'0'.repeat(64)]);assert.notEqual(rejected.exitCode,0);assert.doesNotMatch(rejected.stdout,/INDEPENDENT_VERIFICATION_PASS/);
});

test('P3 kernel PID cap rejects excess children within the owned container',async t=>{
 const id=await fixture(t);const code="const {spawn}=require('child_process');const fs=require('fs');let denied=0;const children=[];for(let i=0;i<130;i++){const c=spawn('sleep',['30'],{stdio:'ignore'});children.push(c);c.on('error',e=>{if(e.code==='EAGAIN')denied++;});}setTimeout(()=>{const current=Number(fs.readFileSync('/sys/fs/cgroup/pids.current','utf8'));const events=fs.readFileSync('/sys/fs/cgroup/pids.events','utf8');for(const c of children)c.kill();console.log(JSON.stringify({denied,current,events}));},1500);";
 const result=await DockerRuntime.exec(id,['node','-e',code],{timeoutMs:10000});assert.equal(result.exitCode,0);const proof=JSON.parse(result.stdout);assert.ok(proof.denied>0);assert.ok(proof.current<=100);assert.match(proof.events,/max [1-9][0-9]*/);
});

test('P3 kernel memory limit kills an over-budget guest process and preserves daemon availability',async t=>{
 const id=await fixture(t);const code="const held=[];for(let i=0;i<160;i++)held.push(Buffer.alloc(16*1024*1024,0x51));console.log('UNEXPECTED_MEMORY_SURVIVAL')";
 const result=await DockerRuntime.exec(id,['node','-e',code],{timeoutMs:30000});assert.notEqual(result.exitCode,0);assert.doesNotMatch(result.stdout,/UNEXPECTED_MEMORY_SURVIVAL/);
 const events=await DockerRuntime.exec(id,['cat','/sys/fs/cgroup/memory.events']);assert.equal(events.exitCode,0);assert.match(events.stdout,/oom_kill [1-9][0-9]*/);assert.equal((await DockerRuntime.checkHealth()).available,true);
});
