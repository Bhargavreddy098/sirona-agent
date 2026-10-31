import {StateGraph,Annotation,START,END,NodeInterrupt} from '@langchain/langgraph';

// LangGraph integration — defines the StateGraph structure
// and the transition logic for parent→specialist delegation, bounded parallelism,
// checkpoint persistence, and approval/review workflows.

export type WorkTask = {key:string;description:string;role:'coder'|'reviewer';modelId:string};
export type WorkProposal = {key:string;output:string;agentId:string};
export interface WorkspaceWork {
  runId:string; version:'1.0.0'; tasks:WorkTask[]; proposals:WorkProposal[];
  expectedBaseDigest?:string;
  repairRounds:number; critiqueRounds:number; status:'running'|'blocked'|'completed';
  review?:{outcome:'pass'|'repair'|'blocked';reason:string};
  execution?:Record<string,unknown>; verification?:{outcome:'pass'|'fail'|'unknown';reportId:string};
  executionFailed?:boolean;
}
/** These ports are bound by the trusted runtime, never by model or HTTP input. */
export interface WorkspaceActivities {
  authorize(work:WorkspaceWork):Promise<void>;
  plan(work:WorkspaceWork):Promise<WorkTask[]>;
  specialize(work:WorkspaceWork,task:WorkTask):Promise<WorkProposal>;
  review(work:WorkspaceWork):Promise<{outcome:'pass'|'repair'|'blocked';reason:string}>;
  approve(work:WorkspaceWork):Promise<boolean>;
  execute(work:WorkspaceWork):Promise<Record<string,unknown>>;
  patch(work:WorkspaceWork):Promise<void>;
  verify(work:WorkspaceWork):Promise<{outcome:'pass'|'fail'|'unknown';reportId:string}>;
}
export const WorkspaceGraphAnnotation = Annotation.Root({
  work:Annotation<WorkspaceWork>,
});

/** Actual graph consumers supply canonical activities; there is no successful no-op graph. */
export function buildWorkspaceGraph(ports:WorkspaceActivities) {
  if (!ports || ['authorize','plan','specialize','review','approve','execute','patch','verify'].some(k=>typeof (ports as any)[k]!=='function')) throw new Error('GRAPH_ACTIVITY_OWNER_REQUIRED');
  type S=typeof WorkspaceGraphAnnotation.State;
  const guarded=(fn:(work:WorkspaceWork)=>Promise<WorkspaceWork>)=>async(s:S)=>{
    if(s.work.version!=='1.0.0')throw new Error('GRAPH_VERSION_UNSUPPORTED');
    await ports.authorize(s.work);
    return {work:await fn(s.work)};
  };
  return new StateGraph(WorkspaceGraphAnnotation)
    .addNode('plan',guarded(async w=>{
      const tasks=await ports.plan(w);
      if(!tasks.length||tasks.length>3||new Set(tasks.map(t=>t.key)).size!==tasks.length)throw new Error('GRAPH_PLAN_INVALID');
      return {...w,tasks};
    }))
    .addNode('fanout',guarded(async w=>{
      // Durable admission supplies the concurrency guard across processes/runs.
      const proposals=await Promise.all(w.tasks.map(t=>ports.specialize(w,t)));
      if(proposals.some(p=>!p.output.trim()))throw new Error('GRAPH_PROPOSAL_EMPTY');
      return {...w,proposals};
    }))
    .addNode('review',guarded(async w=>{
      if(w.critiqueRounds>=2)return {...w,status:'blocked'};
      const review=await ports.review(w);
      return {...w,review,critiqueRounds:w.critiqueRounds+1,status:review.outcome==='blocked'?'blocked':w.status};
    }))
    .addNode('approval',guarded(async w=>{if(!await ports.approve(w))throw new NodeInterrupt('Exact effect approval required');return {...w,status:'running'};}))
    .addNode('execute',guarded(async w=>{
      const execution=await ports.execute(w);const receipt=execution.execResult as {exitCode?:number}|undefined;
      if(!Number.isInteger(receipt?.exitCode))throw new Error('GRAPH_EXECUTION_RECEIPT_REQUIRED');
      return {...w,execution,executionFailed:receipt?.exitCode!==0};
    }))
    .addNode('patch',guarded(async w=>{await ports.patch(w);return w;}))
    .addNode('verify',guarded(async w=>{
      const verification=await ports.verify(w);
      return {...w,verification,status:verification.outcome==='pass'?'completed':verification.outcome==='unknown'?'blocked':'running'};
    }))
    .addNode('repair',guarded(async w=>({...w,expectedBaseDigest:!w.executionFailed&&typeof w.execution?.guestDigest==='string'?w.execution.guestDigest:w.expectedBaseDigest,repairRounds:w.repairRounds+1,proposals:[],execution:undefined,executionFailed:false,verification:undefined})))
    .addEdge(START,'plan').addEdge('plan','fanout').addEdge('fanout','review')
    .addConditionalEdges('review',s=>s.work.status==='blocked'?'stop':s.work.review?.outcome==='pass'?'approve':s.work.repairRounds<2&&s.work.critiqueRounds<2?'repair':'stop',{stop:END,approve:'approval',repair:'repair'})
    .addConditionalEdges('approval',s=>s.work.status==='blocked'?'stop':'execute',{stop:END,execute:'execute'})
    .addConditionalEdges('execute',s=>s.work.executionFailed?s.work.repairRounds<2&&s.work.critiqueRounds<2?'repair':'stop':'patch',{repair:'repair',stop:END,patch:'patch'}).addEdge('patch','verify')
    .addConditionalEdges('verify',s=>s.work.status==='completed'||s.work.status==='blocked'?'stop':s.work.repairRounds<2&&s.work.critiqueRounds<2?'repair':'stop',{stop:END,repair:'repair'})
    .addEdge('repair','fanout');
}


