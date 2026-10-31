import {useCallback,useEffect,useRef,useState} from 'react';
import {executionApi,type Run,type Task,type Agent,type Effect,type Checkpoint,type Verification,type RunEvent} from '../../api/execution';
import {ApiError} from '../../api/client';
type Snapshot={run?:Run;tasks:Task[];agents:Agent[];effects:Effect[];checkpoints:Checkpoint[];verifications:Verification[]};
const empty:Snapshot={tasks:[],agents:[],effects:[],checkpoints:[],verifications:[]};
export function messageOf(cause:unknown){return cause instanceof Error?(cause.name==='ZodError'?'The backend returned an unsupported response. Refresh or check the server version.':cause.message):'The request could not be completed';}
export function useRun(projectId:string,runId:string){
  const [snapshot,setSnapshot]=useState<Snapshot>(empty),[loading,setLoading]=useState(true),[error,setError]=useState(''),[events,setEvents]=useState<RunEvent[]>([]),[streamState,setStreamState]=useState('Connecting…'),[reconnect,setReconnect]=useState(0);
  const read=useRef<AbortController|null>(null),cursor=useRef('0'),scheduled=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
  const refresh=useCallback(async()=>{
    read.current?.abort();const controller=new AbortController();read.current=controller;setLoading(true);setError('');
    const results=await Promise.allSettled([executionApi.run(runId,controller.signal),executionApi.tasks(runId,0,controller.signal),executionApi.agents(runId,0,controller.signal),executionApi.effects(runId,0,controller.signal),executionApi.checkpoints(runId,0,controller.signal),executionApi.verifications(runId,controller.signal)]);
    if(controller.signal.aborted)return;
    const [run,tasks,agents,effects,checkpoints,verifications]=results;
    if(run.status==='fulfilled'&&(run.value.id!==runId||run.value.projectId!==projectId)){setSnapshot(empty);setError('The server returned a different run. No controls are available.');setLoading(false);return;}
    setSnapshot(previous=>({run:run.status==='fulfilled'?run.value:undefined,tasks:tasks.status==='fulfilled'?tasks.value:previous.tasks,agents:agents.status==='fulfilled'?agents.value:previous.agents,effects:effects.status==='fulfilled'?effects.value:previous.effects,checkpoints:checkpoints.status==='fulfilled'?checkpoints.value:previous.checkpoints,verifications:verifications.status==='fulfilled'?verifications.value:previous.verifications}));
    const failures=results.flatMap((result,index)=>result.status==='rejected'?[`${['Run','Tasks','Agents','Effects','Checkpoints','Verification'][index]}: ${messageOf(result.reason)}`]:[]);setError(failures.join(' · '));setLoading(false);
  },[projectId,runId]);
  useEffect(()=>{void refresh();return()=>{read.current?.abort();clearTimeout(scheduled.current);};},[refresh]);
  useEffect(()=>{
    const controller=new AbortController();let timer:ReturnType<typeof setTimeout>|undefined;
    const connect=async()=>{
      for(let attempt=0;attempt<4&&!controller.signal.aborted;attempt++){
        setStreamState(attempt?'Reconnecting…':'Connecting…');
        try{await executionApi.events(runId,cursor.current,controller.signal,event=>{
          if(controller.signal.aborted)return;cursor.current=event.id;setEvents(previous=>[...previous,event].slice(-100));setStreamState('Live');
          clearTimeout(scheduled.current);scheduled.current=setTimeout(()=>void refresh(),200);
        },()=>{if(!controller.signal.aborted)setStreamState('Live');});}
        catch(cause){if(controller.signal.aborted)return;if(cause instanceof ApiError&&[401,403,404,410].includes(cause.status)){setStreamState(messageOf(cause));return;}if(attempt===3){setStreamState(`${messageOf(cause)} Use Reconnect live updates.`);return;}}
        await new Promise<void>(resolve=>{const done=()=>{clearTimeout(timer);controller.signal.removeEventListener('abort',done);resolve();};timer=setTimeout(done,Math.min(500*2**attempt,2000));controller.signal.addEventListener('abort',done,{once:true});});
      }
    };
    void connect();return()=>{controller.abort();clearTimeout(timer);clearTimeout(scheduled.current);};
  },[runId,reconnect,refresh]);
  return{...snapshot,loading,error,events,streamState,refresh,reconnect:()=>setReconnect(value=>value+1)};
}
