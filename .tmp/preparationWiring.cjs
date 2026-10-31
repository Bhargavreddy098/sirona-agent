const fs=require('node:fs');
function edit(file,old,value){const name='frontend/sirona-next/src/features/workspace/'+file;const text=fs.readFileSync(name,'utf8');if(!text.includes(old))throw new Error('Missing expected source '+file);fs.writeFileSync(name,text.replace(old,value));}
edit('Planning.tsx','</p>}</>}','</p>}{contract&&<RunPreparation key={contract.id} projectId={projectId} goal={goal} contract={contract} onPrepared={onPrepared}/>}</>}');
edit('CodingWorkspace.tsx','<Runs projectId={project.id} onBusy={working}/>','<Runs projectId={project.id} initialRunId={preparedRun} onBusy={working}/>');
edit('CodingWorkspace.tsx','<Planning projectId={project.id}/>','<Planning projectId={project.id} onPrepared={id=>{setPreparedRun(id);setSection(\'Runs\');}}/>');
edit('CodingWorkspace.tsx','onChange={event=>setProjectId(event.target.value)}','onChange={event=>{setPreparedRun(undefined);setProjectId(event.target.value);}}');
edit('Runs.tsx',"const [runs,setRuns]=useState<Run[]>([]),[selected,setSelected]=useState('')","const [runs,setRuns]=useState<Run[]>([]),[selected,setSelected]=useState(initialRunId??'')");
