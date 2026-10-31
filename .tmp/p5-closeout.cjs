const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const evidence='docs/integration/evidence/workspace-p5-repair';
const verification=JSON.parse(fs.readFileSync(evidence+'/free-verification.json','utf8'));
const transcript=fs.readFileSync(evidence+'/free-p5-tests.txt','utf8');
if(verification.exitCode!==0||!/# fail 0\b/.test(transcript))throw new Error('P5 free verification must pass before closeout');
const count=Number(transcript.match(/# pass (\d+)/)[1]);
const archive='sironadocs/archive/p5-unverified-2026-10-29';fs.mkdirSync(archive,{recursive:true});
const archives=[];
function preserve(from,name){if(!fs.existsSync(from))return;const bytes=fs.readFileSync(from),dest=path.join(archive,name);if(!fs.existsSync(dest))fs.writeFileSync(dest,bytes);if(!fs.readFileSync(dest).equals(bytes))throw new Error('Archive conflict');archives.push({original:from,archive:dest,sha256:crypto.createHash('sha256').update(bytes).digest('hex')});}
preserve('.tmp/p5-repair-20261029/docs/SIRONA-WORKSPACE-P5-REPORT.md','P5-prior-unverified-report.md');
for(const f of ['backend/P5-VERIFICATION-REPORT.md','backend/P5-08-ACCEPTANCE-HANDOFF.md','docs/integration/SIRONA-WORKSPACE-P5-REPORT.md'])if(fs.existsSync(f)){preserve(f,f.replaceAll('/','--'));fs.writeFileSync(f,'# Superseded P5 report\n\nThe previous report is preserved under `'+archive+'`. It is not acceptance evidence.\n\nCurrent status: [P5 report]('+ (f.startsWith('backend/')?'../docs/':'../')+'SIRONA-WORKSPACE-P5-REPORT.md). Free qualification passes; real-provider acceptance remains unverified.\n');}
fs.writeFileSync(archive+'/README.md','# Superseded P5 claims\n\nThese are byte-preserved historical reports, not approved instructions or current qualification. Use docs/SIRONA-WORKSPACE-P5-REPORT.md and the current ledger.\n');
fs.writeFileSync(archive+'/manifest.json',JSON.stringify(archives,null,2)+'\n');
const status='**Current P5 status (2026-10-29): implementation and free qualification delivered; full acceptance is NOT COMPLETE. The owner prohibits API charges; the real-provider workflow remains UNVERIFIED. No P6+, migrations or production activation is authorized.**\n\n';
const report=`# Sirona P5 implementation closeout

${status}
## Authority and preserved scope

The owner requested completion of the P5 repair and explicitly approved the bounded-provider extension with “Approve the scoped provider extension; free tests only.” The owner separately instructed: “Do not incur any API charges without my explicit approval.” These instructions authorize this repair and free qualification, not inference spending or rollout.

Existing Node/Express services, /api/v1 route names, working PostgreSQL data, provider discovery/native IDs, credential owners, and frontend source/design are preserved. No migration was authored or applied. Working flags remain OFF. No P6 work, commits, pushes, deployments, privileged installs, Docker prune or host execution fallback was performed.

## Delivered implementation

- Actual compiled LangGraph nodes invoke canonical activities: layered-plan consumption, parent fanout/join, independent critique, durable approval interruption, serial Docker execution, exact P3 patch approval/application, fresh independent verification and bounded repair.
- The official saver uses the existing run_checkpoints table. It preserves full SDK state, parent lineage, namespace identity, pending writes/sends, serializer types, exact BIGINT sequences and real run epochs. Explicit flush barriers handle the pinned SDK's asynchronous saves, including writes arriving before their checkpoint. Digest/version/fence failures deny continuation.
- Durable delegation uses runs/tasks/agent_sessions with transaction/advisory locks: parent only, at most three concurrent specialists across the Home profile, twelve total delegated tasks, bounded review/repair rounds and deadlines. Assignment metadata does not become tool permission.
- Model activities use the existing provider and turn-lease owners with stable effect identity, bounded context/output/deadline, exact registry IDs, usage receipts and run reservations. Unknown transport outcomes retain reserved charges and cannot trigger another inference automatically.
- Canonical workflow start/execute/pause/resume/cancel and production lifecycle own graph dispatch. An immutable checkpoint binding plus durable engine event prevents legacy fallback. Authentication is supplied fresh on resume; raw session tokens never enter checkpoint state. Cancellation with uncertain effects stays cancelling.
- Tools, patches and verification call actual existing owners. Synthetic patch success, token-substring verification, no-op graph nodes and the competing prototype execution implementation were removed. Provider changes are optional internal limits; ordinary-chat defaults remain unchanged.

Pinned direct SDK dependencies: @langchain/langgraph 0.2.1, @langchain/langgraph-checkpoint 0.0.18, @langchain/core 0.2.36. These were already installed; no second orchestration engine or retrieval stack was added. External/prompt-verbose LangChain tracing is rejected for this local workflow.

## Verification and its limits

| Check | Actual result |
| --- | --- |
| npm --prefix backend run test:p5:free | ${count}/${count} PASS; zero failures/skips; builds strict TypeScript first |
| Canonical authenticated HTTP/SSE workflow | PASS with explicitly controlled loopback upstream, actual SQL/tasks/leases, actual Docker guest, command/patch/verifier approvals, host patch and independent report; three model transport calls across repeated resumes |
| Independent guest verifier | PASS: deliberately wrong candidate fails; approved correction passes in a different fresh guest; producer self-verification and digest swaps denied |
| Real process death | PASS: actual Node SIGKILL/restart before checkpoint acknowledgment reuses a committed DB effect; dispatched uncertainty is not repeated |
| Interrupted model transport | PASS: actual controlled HTTP interruption retains unknown charges and denies redispatch; turn lease released |
| Scoped source lint | PASS, --deny-warnings |
| Unchanged frontend typecheck | PASS |
| Broader workspace regression | Earlier free run: 78/78 PASS. Its transcript is retained; it is not represented as a final-source real-provider run |
| Whole retained JavaScript static checker | 38 diagnostics remain. Saved-source comparison: 48 before repair, 38 after, no added diagnostic counts by file/code. This is baseline debt, not a green full-source checker |
| Real Google credential authentication | PASS through the existing models metadata endpoint, read-only; no inference |
| Real-provider P5 inference/fanout/recovery | UNVERIFIED: no-charge instruction; no real-model inference was performed |

Controlled upstream text is test input, never evidence of successful real-model inference. Free SQL-only crash fixtures do not qualify arbitrary external exactly-once execution. Full P5 acceptance and production readiness are not claimed.

Additional legacy-suite outcomes are in free-legacy-regression.txt. The broad admission inventory has a pre-existing inability to parse the existing literal-array router.use authentication middleware; the P5 repair does not weaken that security test or its admission policy. Any remaining failures are reported rather than suppressed.

## Evidence and reproducibility

Run **npm --prefix backend run test:p5:free**. This command selects only free P5 suites and pins the isolated test target. Do not use test:workspace as a no-charge substitute: it also includes live-provider tests.

Evidence: docs/integration/evidence/workspace-p5-repair/{free-verification.json,free-p5-tests.txt,build.txt,source-hashes.json,static-baseline-comparison.json,lint.txt,frontend-check.txt,database-preservation.json,credential-status.json,provider-auth-status.json}. All test mutations target sirona_workspace_p0_test_20261028, schema 023. Working sirona remains schema 021; its inspection was enforced READ ONLY.

The replaced prototype assertions tested helpers or fabricated success, not the required activities. Replacement coverage exercises actual SDK/SQL/HTTP/guest behavior plus adversarial denials. Required real-provider acceptance was retained and explicitly left UNVERIFIED.

## Rollback and remaining gate

Source rollback checkpoint: .tmp/p5-repair-20261029/manifest.json and saved files. P4 provider originals were recovered and verified byte-for-byte against accepted P4 hashes. Worker source was reconstructed by reversing only this task's additions; inspect the diff before restoration. Do not reset the checkout or restore unrelated user changes.

Stop new graph starts, quiesce owned work and reconcile uncertain effects before restoring touched files. Keep durable checkpoints/effects and their pinned engine version; never resume a graph as legacy dispatch. No schema rollback exists because no DDL was applied. Do not restore old prototype code into an active graph run.

The remaining acceptance gate is an explicitly approved, bounded real-provider end-to-end test and independent review of its exact-source evidence. Credential configuration is available; no key is requested. Until that gate passes, P5 stays awaiting acceptance and P6 remains unauthorized. Production rollout is a separate later gate.
`;
fs.writeFileSync('docs/SIRONA-WORKSPACE-P5-REPORT.md',report);
let ledger=fs.readFileSync('docs/SIRONA-WORKSPACE-LEDGER.md','utf8');ledger=ledger.replace(/^> \*\*P5 repair status[^\n]*\n\n/,'');
const section=ledger.indexOf('## P5 LangGraph Orchestration & Multi-Agent Workflows');if(section>=0)ledger=ledger.slice(0,section);
ledger=ledger.replace(/^\| P5-01 Versioned graph[^\n]*$/m,'| P5-00 through P5-08 | Accepted P4 + current P5 repair/provider approvals; free tests only | Implementation/free qualification delivered; real-provider acceptance UNVERIFIED | '+count+' free checks; see current P5 report and exact-source evidence | .tmp/p5-repair-20261029; preserve pinned graph engine and journals |');
ledger=ledger.replace(/^\| TECH-01 \|[^\n]*$/m,'| TECH-01 | LangGraph.js | P5, requalified P8 | Implemented and free-qualified; real-provider acceptance pending | Real-provider fanout/review/recovery workflow remains required |');
ledger=ledger.replace('P5 proposal remains unapproved and not started.','Later owner instructions approved the P5 repair and bounded-provider extension for free qualification; see the current P5 closeout below.');
ledger+='## P5 closeout — implementation delivered, acceptance gated\n\n'+status+'\n| Task | Dependencies | Progress / evidence |\n| --- | --- | --- |\n| P5-00 baseline | P4 | Source inspection and rollback snapshot recorded |\n| P5-01 SDK/contracts | P5-00 | Exact pins, strict Zod contracts; strict build PASS |\n| P5-02 durable saver | P5-01 | Actual SDK/SQL round-trip, lineage, pending writes, corruption and BIGINT PASS |\n| P5-03 delegation | P5-02 | Atomic racing fourth denial, flat hierarchy, sequential reuse and total/deadline PASS |\n| P5-04 activities | P5-03 | Canonical model/tool/patch ports; controlled transport and real guest PASS; real-provider qualification UNVERIFIED |\n| P5-05 integration | P5-04 | Canonical HTTP/SSE journey and lifecycle PASS with controlled upstream |\n| P5-06 verifier/repair | P5-05 | Real bad/corrected guest artifacts and independent receipts PASS; model-driven repair quality UNVERIFIED |\n| P5-07 recovery | P5-02–06 | Real Node kills and uncertain-transport refusal PASS; real-provider crash matrix UNVERIFIED |\n| P5-08 handoff | All above | Evidence/report delivered; owner acceptance remains gated, not complete |\n\nSee [P5 report](SIRONA-WORKSPACE-P5-REPORT.md). Do not begin P6 or activate production from this documentation.\n';
fs.writeFileSync('docs/SIRONA-WORKSPACE-LEDGER.md',status+ledger);
let handoff=fs.readFileSync('docs/SIRONA-AGENT-HANDOFF.md','utf8').replace(/^> \*\*P5 repair status[^\n]*\n\n/,'');
handoff=handoff.replace(/^\*\*Latest owner decision: STOP AFTER P3\.\*\*[^\n]*$/m,'**Latest owner decision:** repair P5 and run free local tests; the bounded-provider extension is approved. No API charges, migrations, production activation or P6+ work is approved. This supersedes the older stop instruction only for that exact slice.');
handoff=handoff.replace(/^- P5 LangGraph orchestration:[^\n]*$/m,'- P5: implementation and '+count+' free checks delivered; real-provider acceptance is UNVERIFIED. Read SIRONA-WORKSPACE-P5-REPORT.md. Controlled upstream responses are not real inference proof.');
handoff=handoff.replace(/^- P6 MCP[^\n]*$/m,'- P6: planned and unauthorized; first obtain P5 real-provider acceptance, then separate owner P6 approval.');fs.writeFileSync('docs/SIRONA-AGENT-HANDOFF.md',status+handoff);
let tech=fs.readFileSync('docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md','utf8').replace(/^> \*\*P5 repair status[^\n]*\n\n/,'');tech=tech.replace(/^\| TECH-01 LangGraph.js[^\n]*$/m,'| TECH-01 LangGraph.js | P5 after P1/P3/P4 | Implementation and '+count+' free checks delivered; real-provider qualification UNVERIFIED | Actual real-provider workflow and owner acceptance still required; see P5 report |');fs.writeFileSync('docs/SIRONA-WORKSPACE-TECHNOLOGY-LEDGER.md',status+tech);
const agents='AGENTS.md';const old=fs.readFileSync(agents,'utf8');const backup='.tmp/p5-repair-20261029/AGENTS.md';if(!fs.existsSync(backup))fs.writeFileSync(backup,old);
const amendment='> Current owner P5 repair instruction, 2026-10-29: “proceed and complete that,” followed by “Approve the scoped provider extension; free tests only.” This authorizes the P5 repair and the exact bounded-provider amendment, not paid inference, migrations, production activation or P6+. Current report: docs/SIRONA-WORKSPACE-P5-REPORT.md. P5 real-provider acceptance remains UNVERIFIED under the owner’s no-charge instruction. Earlier stop/status paragraphs below are dated history for this slice; all security and approval rules remain.\n\n';if(!old.includes('Current owner P5 repair instruction'))fs.writeFileSync(agents,amendment+old);
const files=['backend/package.json','backend/package-lock.json','backend/services/aiService.js','backend/services/providerService.js','backend/services/executionService.js','backend/services/agentWorkerService.js','backend/services/workflowOrchestratorService.js','backend/foundation/production.js','backend/routes/v1/execution.routes.js','backend/scripts/verifyP5Free.mjs',...fs.readdirSync('backend/src/orchestration').map(n=>'backend/src/orchestration/'+n),...verification.groups.map(n=>'backend/tests/'+n+'.test.ts'),'backend/tests/helpers/p5-fixture.ts','backend/tests/helpers/p5-crash-child.mjs'];
fs.writeFileSync(evidence+'/source-hashes.json',JSON.stringify(Object.fromEntries(files.map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')])),null,2)+'\n');
console.log(JSON.stringify({freeTests:count,sourceFiles:files.length,archiveFiles:archives.length,status:'implementation/free qualification delivered; real-provider acceptance UNVERIFIED'}));
