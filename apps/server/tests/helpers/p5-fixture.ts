import type {TestContext} from 'node:test';
import {fixture,legacy} from '../typedDatabaseBoundary.test.js';
import {computeStateDigest} from '../../src/orchestration/checkpointAdapter.js';
export async function approvedP5Fixture(t:TestContext,input:Record<string,unknown>|((f:Awaited<ReturnType<typeof fixture>>)=>Promise<Record<string,unknown>>)={}){
  const f=await fixture(t),q=legacy.query,document=typeof input==='function'?await input(f):input,hash=computeStateDigest(document);
  const goal=(await q("INSERT INTO goals(project_id,intent)VALUES($1,'P5 isolated qualification')RETURNING id",[f.projectId])).rows[0].id;
  const req=(await q('INSERT INTO requirement_revisions(goal_id,digest)VALUES($1,$2)RETURNING id',[goal,hash])).rows[0].id;
  const plan=(await q('INSERT INTO plans(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;
  const planRev=(await q('INSERT INTO plan_revisions(plan_id,goal_id,requirement_revision_id,digest)VALUES($1,$2,$3,$4)RETURNING id',[plan,goal,req,hash])).rows[0].id;
  const contract=(await q('INSERT INTO contracts(goal_id)VALUES($1)RETURNING id',[goal])).rows[0].id;
  const rev=(await q("INSERT INTO contract_revisions(contract_id,goal_id,plan_revision_id,requirement_revision_id,digest,document)VALUES($1,$2,$3,$4,$5,$6::jsonb)RETURNING id",[contract,goal,planRev,req,hash,JSON.stringify(document)])).rows[0].id;
  await q('UPDATE runs SET goal_id=$2,contract_revision_id=$3,plan_revision_id=$4,budget_limit_micro_usd=5000000 WHERE id=$1',[f.runId,goal,rev,planRev]);
  const a=await legacy.GovernanceService.createApprovalRequest({projectId:f.projectId,inputDigest:hash,kind:'contract',contractRevisionId:rev,ttlMs:600000});
  await legacy.GovernanceService.decideApproval(a.approval.id,{decision:'approve',nonce:a.nonce,digest:hash,approverId:f.identity.principalId});
  const parentId=(await q("INSERT INTO agent_sessions(run_id,role,state,capabilities)VALUES($1,'p5_parent','active','[]')RETURNING id",[f.runId])).rows[0].id;
  return {...f,parentId,goalId:goal,contractRevisionId:rev,contractDigest:hash};
}
