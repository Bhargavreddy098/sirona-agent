import {useCallback,useEffect,useRef,useState} from 'react';
import {Terminal as XTerminal} from '@xterm/xterm';
import {FitAddon} from '@xterm/addon-fit';
import {z} from 'zod';
import '@xterm/xterm/css/xterm.css';
import {workspaceApi,terminalChannel,type WorkspaceReadiness,type TerminalPreparation,type TerminalInputPreparation} from '../../api/workspace';
import {executionApi,type Run} from '../../api/execution';
import {Dialog} from '../../components/Dialog';
import {PreparedActionReview,type PreparedAction} from './PreparedActionReview';
import {messageOf} from './useRun';
const frame=z.discriminatedUnion('type',[
 z.object({type:z.literal('output'),data:z.string().max(1048576)}),z.object({type:z.literal('attached'),terminalId:z.uuid(),inputRequiresApproval:z.literal(true)}),
 z.object({type:z.literal('resized'),cols:z.number().int(),rows:z.number().int()}),z.object({type:z.literal('receipt'),receipt:z.object({effectId:z.uuid(),terminalId:z.uuid(),status:z.literal('input_submitted'),commandsCompleted:z.literal(false)})}),z.object({type:z.literal('error'),code:z.string().max(100)}),
]);
const reasons:Record<string,string>={PROFILE_NOT_ACTIVATED:'Local Docker execution has not been activated by the owner.',GUEST_NOT_QUALIFIED:'The trusted-local Docker profile needs fresh qualification.',RELIABILITY_UNMIGRATED:'This database has not received the separately approved execution migration.',REVOKED_GRANT:'Required scoped project permissions are missing or expired.',REGISTERED_ROOT_REQUIRED:'Register the project directory in Files first.',WORKER_BUSY:'A Home-profile worker is already active. Close or reconcile it before starting another.',POLICY_DENIED:'Current policy denies this operation.'};
export function TerminalPanel({projectId,onBusy}:{projectId:string;onBusy:(busy:boolean)=>void}){
 const [ready,setReady]=useState<WorkspaceReadiness>(),[runs,setRuns]=useState<Run[]>([]),[runId,setRunId]=useState(''),[root,setRoot]=useState(''),[prep,setPrep]=useState<TerminalPreparation>(),[openingApproval,setOpeningApproval]=useState(''),[terminalId,setTerminalId]=useState(''),[attached,setAttached]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[draft,setDraft]=useState(''),[input,setInput]=useState<TerminalInputPreparation>(),[inputApproval,setInputApproval]=useState(''),[awaiting,setAwaiting]=useState(false),[uncertain,setUncertain]=useState(false),[review,setReview]=useState<{action:PreparedAction;kind:'open'|'input'}>(),[cancel,setCancel]=useState(false),[cancelling,setCancelling]=useState(false),[preview,setPreview]=useState('');
 const alive=useRef(true),lock=useRef(false),cancelLock=useRef(false),socket=useRef<WebSocket|null>(null),term=useRef<XTerminal|null>(null),host=useRef<HTMLDivElement>(null),prepareKey=useRef(crypto.randomUUID()),pendingInput=useRef<TerminalInputPreparation|undefined>(undefined),receiptTimer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),confirmedClosed=useRef(false);
 const activeRun=runs.find(run=>run.id===runId);
 const [recovery,setRecovery]=useState('');
 const refresh=useCallback(async()=>{setLoading(true);setError('');try{const [status,saved]=await Promise.all([workspaceApi.readiness(projectId),executionApi.runs(projectId)]);if(alive.current){setReady(status);setRuns(saved);setRoot(current=>status.files.roots.some(item=>item.id===current)?current:status.files.roots[0]?.id??'');}}catch(cause){if(alive.current)setError(messageOf(cause));}finally{if(alive.current)setLoading(false);}},[projectId]);
 useEffect(()=>{alive.current=true;void refresh();return()=>{alive.current=false;clearTimeout(receiptTimer.current);socket.current?.close();onBusy(false);};},[refresh,onBusy]);
 useEffect(()=>{onBusy(busy||Boolean(terminalId));},[busy,terminalId,onBusy]);
 useEffect(()=>{
  if(!host.current)return;
  const getTerminalTheme = () => {
   const isDark = document.documentElement.classList.contains('dark');
   return isDark ? {
    background: '#0d0e11',
    foreground: '#e5e7eb',
    cursor: '#3b82f6',
    selectionBackground: 'rgba(59, 130, 246, 0.35)',
    black: '#1f2937',
    red: '#ef4444',
    green: '#10b981',
    yellow: '#f59e0b',
    blue: '#3b82f6',
    magenta: '#a855f7',
    cyan: '#06b6d4',
    white: '#f3f4f6',
   } : {
    background: '#fafafa',
    foreground: '#1e2128',
    cursor: '#2563eb',
    selectionBackground: 'rgba(37, 99, 235, 0.2)',
    black: '#374151',
    red: '#dc2626',
    green: '#059669',
    yellow: '#d97706',
    blue: '#2563eb',
    magenta: '#9333ea',
    cyan: '#0891b2',
    white: '#ffffff',
   };
  };
  const terminal=new XTerminal({
   disableStdin:true,
   screenReaderMode:true,
   minimumContrastRatio:4.5,
   scrollback:1000,
   fontSize:12,
   fontFamily:getComputedStyle(document.documentElement).getPropertyValue('--font-mono').trim()||'Consolas,monospace',
   cursorBlink:false,
   theme:getTerminalTheme()
  }),fit=new FitAddon();
  terminal.loadAddon(fit);terminal.open(host.current);term.current=terminal;
  // Guest output cannot access the clipboard or create actionable OSC hyperlinks.
  const clipboard=terminal.parser.registerOscHandler(52,()=>true),links=terminal.parser.registerOscHandler(8,()=>true);
  let timer:ReturnType<typeof setTimeout>|undefined;
  const resize=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(!alive.current)return;fit.fit();if(socket.current?.readyState===WebSocket.OPEN)socket.current.send(JSON.stringify({type:'resize',cols:Math.min(500,Math.max(1,terminal.cols)),rows:Math.min(300,Math.max(1,terminal.rows))}));},100);};
  const observer=new ResizeObserver(resize);observer.observe(host.current);resize();void document.fonts.ready.then(()=>{if(alive.current)resize();});

  // Watch for theme changes and update terminal colors dynamically
  const themeObserver = new MutationObserver(() => {
   terminal.options.theme = getTerminalTheme();
  });
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });

  return()=>{
   clearTimeout(timer);
   observer.disconnect();
   themeObserver.disconnect();
   clipboard.dispose();
   links.dispose();
   terminal.dispose();
   term.current=null;
  };
 },[]);
 const act=async(task:()=>Promise<void>)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');setNotice('');try{await task();}catch(cause){if(alive.current)setError(messageOf(cause));}finally{lock.current=false;if(alive.current)setBusy(false);}};
 const attach=async(id:string)=>{
  socket.current?.close();const ws=await terminalChannel(id);socket.current=ws;confirmedClosed.current=false;setNotice('Connecting to the existing guest PTY. Earlier output is not replayed.');
  let pendingOutput=0;
  ws.onmessage=event=>{
   if(!alive.current||socket.current!==ws)return;
   try{if(typeof event.data!=='string'||event.data.length>1100000)throw new Error('Unsupported terminal frame');const value=frame.parse(JSON.parse(event.data));
    if(value.type==='output'){pendingOutput+=value.data.length;if(pendingOutput>2097152)throw new Error('Terminal output budget exceeded');if(term.current)term.current.write(value.data,()=>{pendingOutput-=value.data.length;});else pendingOutput-=value.data.length;}
    if(value.type==='attached'){if(value.terminalId!==id)throw new Error('Terminal binding mismatch');setAttached(true);setNotice('Guest terminal attached. Each submitted command requires its own exact approval.');if(term.current)ws.send(JSON.stringify({type:'resize',cols:Math.min(500,term.current.cols),rows:Math.min(300,term.current.rows)}));}
    if(value.type==='receipt'){if(value.receipt.terminalId!==id||!pendingInput.current)throw new Error('Unexpected terminal receipt');clearTimeout(receiptTimer.current);pendingInput.current=undefined;setInput(undefined);setInputApproval('');setDraft('');setAwaiting(false);setNotice('Input submission recorded. Command completion is not independently verified by this receipt.');}
    if(value.type==='error'){clearTimeout(receiptTimer.current);setAwaiting(false);setUncertain(true);setError(`Terminal input was not confirmed (${value.code}). Inspect the run’s Effects after closing or reconciling the guest; input is never resent automatically.`);}
   }catch{setError('The terminal returned an unsupported or mismatched frame. Reconnect or close and reconcile the guest.');setUncertain(true);ws.close();}
  };
  ws.onerror=()=>{if(alive.current&&socket.current===ws)setError('The terminal channel could not connect. Use the existing-worker recovery path if the backend restarted.');};
  ws.onclose=()=>{if(!alive.current||socket.current!==ws||confirmedClosed.current)return;setAttached(false);if(pendingInput.current){clearTimeout(receiptTimer.current);setAwaiting(false);setUncertain(true);setError('The channel closed before input submission was confirmed. Do not replay the input. Close or recover the guest and inspect the saved effect.');}else setNotice('Guest output disconnected. Reconnect only attaches to a still-live owned PTY.');};
 };
 const prepare=()=>act(async()=>{const value=await workspaceApi.prepareTerminal(projectId,runId,root,prepareKey.current);if(alive.current){setPrep(value);setOpeningApproval('');setNotice('Fixed guest shell prepared. Review its exact approval before opening it.');await refresh();}});
 const open=()=>act(async()=>{if(!prep||!openingApproval)return;const result=await workspaceApi.openTerminal(projectId,prep.preparationId,openingApproval,crypto.randomUUID());if(!result.live)throw new Error('The terminal has no live owner. Use recovery; a restarted PTY is not simulated.');if(alive.current){setTerminalId(result.terminalId);setUncertain(false);await attach(result.terminalId);await refresh();}});
 const prepareInput=()=>act(async()=>{if(!terminalId||!draft.trim())return;const data=draft.endsWith('\n')?draft:draft+'\n';if(new TextEncoder().encode(data).length>8192)throw new Error('A single approved terminal input is limited to 8 KiB.');const value=await workspaceApi.prepareTerminalInput(terminalId,data,crypto.randomUUID());if(value.data!==data||value.terminalId!==terminalId)throw new Error('The returned input preparation differs from the reviewed command.');if(alive.current){setInput(value);setInputApproval('');setNotice('Exact terminal input prepared. Request its review proof before submitting.');}});
 const submitInput=()=>{
  if(!input||!inputApproval||awaiting||pendingInput.current||uncertain||socket.current?.readyState!==WebSocket.OPEN)return;
  pendingInput.current=input;setAwaiting(true);setError('');
  try{socket.current.send(JSON.stringify({type:'input',data:input.data,approvalId:inputApproval,operationKey:input.operationKey}));receiptTimer.current=setTimeout(()=>{if(alive.current){setAwaiting(false);setUncertain(true);setError('No submission receipt was received. The outcome is unknown; input will not be retried automatically.');}},30000);}catch{setAwaiting(false);setUncertain(true);setError('Input submission is unconfirmed. Close or reconcile the guest before another command.');}
 };
 const closed=()=>{confirmedClosed.current=true;clearTimeout(receiptTimer.current);pendingInput.current=undefined;socket.current?.close();socket.current=null;setTerminalId('');setAttached(false);setPrep(undefined);setOpeningApproval('');setInput(undefined);setInputApproval('');setAwaiting(false);setUncertain(false);prepareKey.current=crypto.randomUUID();};
 const close=()=>act(async()=>{if(!terminalId)return;const result=await workspaceApi.closeTerminal(terminalId);if(result.status!=='closed')throw new Error('The backend has not confirmed guest termination yet. Refresh and reconcile before continuing.');if(alive.current){closed();setPreview(result.patchPreviewId??'');setNotice('Guest termination confirmed. Guest changes, if any, are held in a saved patch preview for separate review.');await refresh();}});
 const recover=(id:string)=>act(async()=>{const result=await workspaceApi.recoverWorkers(projectId,id);if(alive.current){if(result.unresolved)throw new Error(`${result.unresolved} workers remain unresolved. No terminal or effect has been replayed.`);const status=await workspaceApi.readiness(projectId);const current=status.preparations.find(p=>p.runId===id&&p.workerStatus==='running');if(current)throw new Error('A guest is still reported running. Keep its recovery record.');closed();setRecovery('');setReady(status);setNotice(`${result.stopped} workers confirmed stopped; ${result.preparationsCancelled??0} terminal tasks reconciled. Unknown effects still require independent reconciliation.`);}});
 const adopt=(p:WorkspaceReadiness['preparations'][number])=>{setRunId(p.runId);setRoot(p.rootRef);if(p.status==='prepared'&&p.usable&&p.eventSequence&&p.inputDigest)setPrep({preparationId:p.preparationId,runId:p.runId,kind:'terminal_open',inputDigest:p.inputDigest,eventSequence:p.eventSequence,expiresAt:p.expiresAt,command:['/bin/sh']});else if(p.terminalId&&p.workerStatus==='running'){setTerminalId(p.terminalId);void act(()=>attach(p.terminalId!));}};
 const reviewOpen=()=>{if(prep)setReview({kind:'open',action:{runId:prep.runId,eventSequence:prep.eventSequence,inputDigest:prep.inputDigest,summary:'Open a fixed /bin/sh shell inside this project’s trusted-local Docker guest. Every later input requires a separate exact approval.',command:prep.command}});};
 const reviewInput=()=>{if(input)setReview({kind:'input',action:{runId:input.runId,eventSequence:input.eventSequence,inputDigest:input.inputDigest,summary:'Submit exactly this terminal input. It becomes part of the run’s controlled execution history.',command:[input.data]}});};
 return <section aria-label="Guest terminal"><div className="workspace-toolbar"><div><h2>Guest terminal</h2><p className="muted">An actual Docker + WSL2 PTY for trusted local projects, with server-owned leases and per-input approvals.</p></div><button className="secondary" disabled={busy||loading} onClick={()=>void refresh()}>Refresh terminal status</button></div>{loading&&<p className="muted" role="status">Checking guest execution prerequisites…</p>}{error&&<p className="notice error" role="alert">{error}</p>}{notice&&<p className="notice" role="status">{notice}</p>}{ready&&!ready.terminal.canPrepare&&!terminalId&&<p className="notice">{reasons[ready.terminal.reasonCode??'']??ready.terminal.reasonCode??'Terminal preparation is unavailable.'}</p>}
  {!terminalId&&<div className="terminal-setup"><label className="workspace-field">Running approved run<select aria-label="Running approved run" value={runId} disabled={busy||!!prep} onChange={event=>{setRunId(event.target.value);prepareKey.current=crypto.randomUUID();}}><option value="">Choose a running run</option>{runs.filter(run=>run.state==='running'&&run.contractRevisionId).map(run=><option key={run.id} value={run.id}>{run.id.slice(0,8)} · {run.autonomyMode}</option>)}</select></label><label className="workspace-field">Registered root<select aria-label="Registered root" value={root} disabled={busy||!!prep} onChange={event=>{setRoot(event.target.value);prepareKey.current=crypto.randomUUID();}}><option value="">Choose a registered directory</option>{ready?.files.roots.map(value=><option key={value.id} value={value.id}>Project root {value.id.slice(0,8)}</option>)}</select></label><button className="secondary" disabled={busy||!ready?.terminal.canPrepare||!runId||!root||!!prep} onClick={()=>void prepare()}>Prepare guest terminal</button></div>}
  {prep&&!terminalId&&<div className="workspace-section"><h3>Prepared guest shell</h3><p className="muted">Expires {new Date(prep.expiresAt).toLocaleString()}</p><code className="digest">{prep.inputDigest}</code><div className="workspace-actions"><button className="secondary" disabled={busy||Date.parse(prep.expiresAt)<=Date.now()} onClick={reviewOpen}>Review terminal opening</button><button className="primary" disabled={busy||!openingApproval||Date.parse(prep.expiresAt)<=Date.now()} onClick={()=>void open()}>Open approved terminal</button><button className="secondary" disabled={busy} onClick={()=>{setError('');setRecovery(prep.runId);}}>Stop or discard run resources</button></div></div>}
  {!prep&&!terminalId&&ready?.preparations.map(p=><div className="workspace-section" key={p.preparationId}><h3>Saved terminal preparation</h3><p className="muted">{p.status} · Run {p.runId.slice(0,8)} · {p.workerStatus??'No guest worker'}{p.usable?'':' · Not currently usable'}</p><div className="workspace-actions">{p.usable&&<button className="secondary" disabled={busy} onClick={()=>adopt(p)}>{p.terminalId?'Reconnect owned terminal':'Review saved preparation'}</button>}<button className="secondary" disabled={busy} onClick={()=>{setError('');setRecovery(p.runId);}}>Stop or reconcile saved preparation</button></div></div>)}
  <div className="terminal-surface" ref={host} role="region" aria-label="Guest terminal output"/>
  {terminalId&&<><div className="workspace-actions"><span className="muted" role="status">{attached?'Attached to live guest':'Output disconnected'}</span><button className="secondary" disabled={busy||attached} onClick={()=>void act(()=>attach(terminalId))}>Reconnect terminal output</button><button className="secondary" disabled={busy} onClick={()=>void close()}>Close guest terminal</button><button className="danger" disabled={busy} onClick={()=>{setError('');setRecovery(runId);}}>Stop and reconcile guest</button></div><form className="terminal-command-form" onSubmit={event=>{event.preventDefault();void prepareInput();}}><label htmlFor="terminal-command">Command to review</label><textarea id="terminal-command" rows={3} maxLength={8191} value={draft} disabled={busy||!attached||!!input||uncertain} onChange={event=>setDraft(event.target.value)} spellCheck={false}/><p className="muted">Typing in the terminal display does not send input. Prepare, approve and submit the exact command below.</p><div className="workspace-actions"><button className="secondary" disabled={busy||!attached||!draft.trim()||!!input||uncertain}>Prepare terminal input</button>{input&&<><button type="button" className="secondary" disabled={busy||awaiting||uncertain} onClick={reviewInput}>Review exact terminal input</button><button type="button" className="primary" disabled={busy||awaiting||uncertain||!attached||!inputApproval} onClick={submitInput}>{awaiting?'Awaiting submission receipt…':'Submit approved input'}</button></>}</div></form></>}
  {activeRun&&<button className="text-button terminal-cancel" disabled={cancelling} onClick={()=>setCancel(true)}>Cancel the selected run</button>}
  {preview&&<p className="muted">Saved quarantined patch preview: <code>{preview}</code>. Opening or closing a terminal does not apply it to the host.</p>}
  {review&&<PreparedActionReview key={`${review.kind}:${review.action.eventSequence}`} action={review.action} onClose={()=>setReview(undefined)} onDecided={(state,approvalId)=>{if(state==='approved'){if(review.kind==='open')setOpeningApproval(approvalId);else setInputApproval(approvalId);setNotice('Exact approval recorded. Opening and input submission remain separate explicit actions.');}else{if(review.kind==='input'){setInput(undefined);setInputApproval('');}else setOpeningApproval('');setNotice('The exact request was rejected. Nothing was submitted by this decision.');}}}/>}
  <Dialog open={!!recovery} dismissible={!busy} onClose={()=>setRecovery('')} title="Stop and reconcile this run’s guests?"><p>This stops the selected run’s outstanding Docker workers and discards unclaimed terminal preparations. Unsaved guest changes may be lost. Unknown effects remain unresolved; this does not replay them or mark the run successful.</p><code>{recovery}</code>{error&&<p className="notice error" role="alert">{error}</p>}<div className="dialog-actions"><button className="secondary" disabled={busy} onClick={()=>setRecovery('')}>Keep resources</button><button className="danger" disabled={busy} onClick={()=>void recover(recovery)}>Confirm stop and reconciliation</button></div></Dialog>
  <Dialog open={cancel} dismissible={!cancelling} onClose={()=>setCancel(false)} title="Cancel this run and its terminal?"><p>The backend will fence the run and stop its guest. Cancellation remains pending until outstanding resources and effects are reconciled.</p><div className="dialog-actions"><button className="secondary" disabled={cancelling} onClick={()=>setCancel(false)}>Keep run</button><button className="danger" disabled={cancelling} onClick={()=>{if(!activeRun||cancelLock.current)return;cancelLock.current=true;setCancelling(true);void executionApi.control(activeRun,'cancel',crypto.randomUUID()).then(()=>{if(alive.current){setCancel(false);setNotice('Cancellation requested. Confirm guest termination using Close or Reconcile before treating it as stopped.');}}).catch(cause=>{if(alive.current)setError(messageOf(cause));}).finally(()=>{cancelLock.current=false;if(alive.current)setCancelling(false);});}}>Request run cancellation</button></div></Dialog>
 </section>;
}
