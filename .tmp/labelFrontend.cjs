const fs=require('node:fs');
for(const [file,old,value]of [
 ['CodingWorkspace.tsx',"<select value={project?.id??''}","<select aria-label=\"Project\" value={project?.id??''}"],
 ['Runs.tsx','<select value={selected} disabled={working}','<select aria-label="Run" value={selected} disabled={working}'],
 ['Runs.tsx','<select value={checkpoint}','<select aria-label="Checkpoint for the next resume" value={checkpoint}'],
 ['Planning.tsx','<select value={selected}','<select aria-label="Goal" value={selected}'],
 ['Files.tsx','<select value={root}','<select aria-label="Registered directory" value={root}'],
 ]){const name='frontend/sirona-next/src/features/workspace/'+file;const source=fs.readFileSync(name,'utf8');if(!source.includes(old))throw new Error('Missing selection source '+file);fs.writeFileSync(name,source.replace(old,value));}
