const fs=require('node:fs');
function edit(file,pairs){let text=fs.readFileSync(file,'utf8');for(const [old,value]of pairs){if(!text.includes(old))throw new Error('Missing expected source fragment in '+file);text=text.replace(old,value);}fs.writeFileSync(file,text);}
edit('frontend/sirona-next/src/features/model-providers/Providers.tsx',[
 ["import {Dialog} from '../../components/Dialog';","import {Dialog} from '../../components/Dialog';\nimport {CredentialStatus} from './CredentialStatus';"],
 ["const labels=['Connections','Models','Routing'];","const labels=['Connections','Models','Routing','Security'];"],
 ["    <Dialog open={!!editor}","    {tab==='Security'&&<CredentialStatus/>}\n    <Dialog open={!!editor}"],
]);
edit('frontend/sirona-next/src/features/workspace/Runs.tsx',[
 ["disabled={busy||unknown||!['paused','blocked'].includes(run.state)}","disabled={busy||executing||unknown||!['paused','blocked'].includes(run.state)}"],
 ["disabled={busy||unknown||run.state!=='running'}","disabled={busy||executing||unknown||run.state!=='running'}"],
 ["'recovering','cancelling'].includes(run.state)","'recovering'].includes(run.state)"],
 ["[more,setMore]=useState(false);const request=useRef<AbortController|null>(null);","[more,setMore]=useState(false),[working,setWorking]=useState(false);const request=useRef<AbortController|null>(null);\n  const changeBusy=useCallback((value:boolean)=>{setWorking(value);onBusy(value);},[onBusy]);"],
 ['disabled={loading} onClick={()=>void refresh()}', 'disabled={loading||working} onClick={()=>void refresh()}'],
 ['<select value={selected} onChange=', '<select value={selected} disabled={working} onChange='],
 ['onBusy={onBusy} onChange=', 'onBusy={changeBusy} onChange='],
]);
