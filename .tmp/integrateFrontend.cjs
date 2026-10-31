const fs=require('node:fs');
function edit(file,changes){let text=fs.readFileSync(file,'utf8');for(const [old,value]of changes){if(!text.includes(old))throw new Error('Missing expected frontend source fragment in '+file);text=text.replace(old,value);}fs.writeFileSync(file,text);}
edit('frontend/sirona-next/src/app/App.tsx',[
 ["import {Projects} from '../features/projects/Projects';","import {Projects} from '../features/projects/Projects';\nimport {CodingWorkspace} from '../features/workspace/CodingWorkspace';"],
 ["useState<'chat'|'projects'|'settings'>('chat')","useState<'chat'|'projects'|'settings'|'workspace'>('chat')"],
 ["[remove,setRemove]=useState(false);","[remove,setRemove]=useState(false),[workspaceProject,setWorkspaceProject]=useState<string>(),[executionBusy,setExecutionBusy]=useState(false);"],
 ["const navigate=(next:typeof page)=>{if(!w.running)setPage(next);};","const locked=w.running||executionBusy;\n  const navigate=(next:typeof page)=>{if(!locked)setPage(next);};"],
 ["</nav><History","<button aria-current={page==='workspace'?'page':undefined} disabled={locked} onClick={()=>navigate('workspace')}><RiSideBarLine size={23}/>Workspace</button></nav><History"],
 ["page==='settings'?'Settings':page==='projects'?'Projects'","page==='settings'?'Settings':page==='workspace'?'Workspace':page==='projects'?'Projects'"],
 ["page==='settings'?'Model providers':'Project conversations'","page==='settings'?'Model providers':page==='workspace'?'Project workspace':'Project conversations'"],
 ["onNew={id=>{w.newChat(id);setPage('chat');}}/>","onNew={id=>{w.newChat(id);setPage('chat');}} onWorkspace={id=>{setWorkspaceProject(id);setPage('workspace');}}/>"],
 [":<Providers onBack",":page==='workspace'?<CodingWorkspace key={workspaceProject??'all'} projects={w.projects} connected={w.connected} initialProjectId={workspaceProject} onBusy={setExecutionBusy}/>:<Providers onBack"],
]);
const appFile='frontend/sirona-next/src/app/App.tsx';fs.writeFileSync(appFile,fs.readFileSync(appFile,'utf8').replaceAll('disabled={w.running}','disabled={locked}').replaceAll('!w.active||w.running','!w.active||locked'));
edit('frontend/sirona-next/src/features/projects/Projects.tsx',[
 ['{projects,onOpen,onNew}:{projects:Project[];onOpen:(conversation:Conversation)=>void;onNew:(id:string)=>void}','{projects,onOpen,onNew,onWorkspace}:{projects:Project[];onOpen:(conversation:Conversation)=>void;onNew:(id:string)=>void;onWorkspace?:(id:string)=>void}'],
 ['{selected&&<button className="primary" onClick={()=>onNew(selected.id)}>', '{selected&&onWorkspace&&<button className="secondary" onClick={()=>onWorkspace(selected.id)}>Open workspace</button>}{selected&&<button className="primary" onClick={()=>onNew(selected.id)}>'],
]);
