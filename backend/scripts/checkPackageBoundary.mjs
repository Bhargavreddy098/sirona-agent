import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

export function isSensitivePackagePath(value){
 const parts=value.replaceAll('\\','/').split('/');return parts.some(part=>(/^\.env(?:\.|$)/i.test(part)&&part!=='.env.example')||/\.(?:db|sqlite|sqlite3)(?:-|$)/i.test(part)||/\.(?:pem|key|pfx|p12|zip)$/i.test(part));
}
/** Inspect the real npm payload without creating a tarball or running lifecycle scripts. */
export function inspectNpmPayload(cwd){
 const npm=process.env.npm_execpath??path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
 if(!existsSync(npm))throw new Error('NPM_CLI_UNAVAILABLE');
 const result=spawnSync(process.execPath,[npm,'pack','--dry-run','--ignore-scripts','--offline','--json'],{cwd,encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,windowsHide:true});
 if(result.error||result.status!==0)throw new Error('PACKAGE_INSPECTION_FAILED');
 let packages;try{packages=JSON.parse(result.stdout);}catch{throw new Error('PACKAGE_INSPECTION_INVALID');}
 if(!Array.isArray(packages)||packages.length!==1||!Array.isArray(packages[0].files))throw new Error('PACKAGE_INSPECTION_INVALID');
 const files=packages[0].files.map(file=>file.path);if(files.some(file=>typeof file!=='string'))throw new Error('PACKAGE_INSPECTION_INVALID');
 return{files,violations:files.filter(isSensitivePackagePath)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){try{const result=inspectNpmPayload(fileURLToPath(new URL('../',import.meta.url)));console.log(JSON.stringify({event:'package.boundary',files:result.files.length,violations:result.violations}));if(result.violations.length)process.exitCode=1;}catch{console.error(JSON.stringify({event:'package.boundary',status:'UNVERIFIED'}));process.exitCode=1;}}
