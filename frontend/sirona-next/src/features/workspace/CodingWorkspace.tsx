import {lazy,Suspense,useCallback,useState} from 'react';
import type {Project} from '../../api/schemas';
import {Runs} from './Runs';
import {Planning} from './Planning';
import {Files} from './Files';
import {Approvals} from './Approvals';
import {Workers} from './Workers';
import {Readiness} from './Readiness';
const TerminalPanel=lazy(()=>import('./Terminal').then(module=>({default:module.TerminalPanel})));
const sections=['Runs','Planning','Files','Approvals','Terminal','Workers'] as const;
export function CodingWorkspace({projects,connected,initialProjectId,onBusy}:{projects:Project[];connected:boolean;initialProjectId?:string;onBusy:(busy:boolean)=>void}){
  const [projectId,setProjectId]=useState(initialProjectId??''),[section,setSection]=useState<typeof sections[number]>('Runs'),[busy,setBusy]=useState(false),[preparedRun,setPreparedRun]=useState<string>();
  const working=useCallback((value:boolean)=>{setBusy(value);onBusy(value);},[onBusy]);
  const project=projects.find(item=>item.id===projectId);
  return <div className="coding-workspace"><div className="page-heading"><div><h1>Project workspace</h1><p>Inspect real project files, saved execution and approval records.</p></div></div>{!connected?<div className="workspace-empty"><h2>Connect through the desktop app</h2><p>Use Reconnect above in Sirona desktop. Browser preview keeps authentication and local execution boundaries intact.</p></div>:!projects.length?<div className="workspace-empty"><h2>No projects in this workspace</h2><p>Existing projects will appear here. Standalone chat stays available without creating a project or granting file access.</p></div>:<><label className="workspace-field project-selector">Project<select aria-label="Project" value={project?.id??''} disabled={busy} onChange={event=>{setPreparedRun(undefined);setProjectId(event.target.value);}}><option value="">Choose a project</option>{projects.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>{project?<><Readiness key={project.id} projectId={project.id}/><nav className="workspace-tabs" aria-label="Project workspace sections">{sections.map(item=><button key={item} aria-current={section===item?'page':undefined} disabled={busy} onClick={()=>setSection(item)}>{item}</button>)}</nav><div key={`${project.id}:${section}`} className="workspace-content">{section==='Runs'?<Runs projectId={project.id} initialRunId={preparedRun} onBusy={working}/>:section==='Planning'?<Planning projectId={project.id} onPrepared={id=>{setPreparedRun(id);setSection('Runs');}}/>:section==='Files'?<Files projectId={project.id}/>:section==='Approvals'?<Approvals projectId={project.id}/>:section==='Terminal'?<Suspense fallback={<p className="muted" role="status">Loading terminal controls…</p>}><TerminalPanel projectId={project.id} onBusy={working}/></Suspense>:<Workers projectId={project.id} onBusy={working}/>}</div></>:<div className="workspace-empty"><h2>Choose a project to inspect</h2><p>Selecting a project does not grant filesystem access, start agents or enable execution.</p></div>}</>}
  </div>;
}
