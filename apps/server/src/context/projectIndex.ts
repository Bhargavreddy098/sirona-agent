import path from 'node:path';
import {Worker} from 'node:worker_threads';
import {watch} from 'chokidar';
import {WorkspaceBroker,type WorkspaceSnapshot} from '../workspace/workspaceBroker.js';
import {canonicalDigest,P6Error,publicSourcePath} from '../tools/toolContracts.js';
import {indexedFileSchema,type IndexedFile} from './contextContracts.js';

export async function indexSource(file:string,source:string,signal?:AbortSignal):Promise<IndexedFile>{
  if(!publicSourcePath(file))throw new P6Error('SOURCE_EXCLUDED',403);
  const extension=path.posix.extname(file),language=({'.js':'javascript','.jsx':'javascript','.mjs':'javascript','.cjs':'javascript','.ts':'typescript','.tsx':'tsx','.sql':'sql'} as const)[extension as '.js'];
  if(!language)throw new P6Error('LANGUAGE_UNSUPPORTED',422);
  if(signal?.aborted)throw new P6Error('CONTEXT_CANCELLED',499);
  if(Buffer.byteLength(source)>1048576)throw new P6Error('SOURCE_LIMIT',413);
  const worker=new Worker(new URL('./parserWorker.js',import.meta.url),{workerData:{path:file,source,language},resourceLimits:{maxOldGenerationSizeMb:64,maxYoungGenerationSizeMb:16,stackSizeMb:4}});
  return new Promise((resolve,reject)=>{
    let done=false;const finish=(error?:Error,value?:unknown)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);void worker.terminate();if(error)reject(error);else{try{resolve(indexedFileSchema.parse(value));}catch{reject(new P6Error('PARSER_RESPONSE_INVALID',503));}}};
    const abort=()=>finish(new P6Error('CONTEXT_CANCELLED',499)),timer=setTimeout(()=>finish(new P6Error('PARSE_TIMEOUT',408)),5000);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    worker.once('message',message=>message.ok?finish(undefined,message.result):finish(new P6Error(message.code==='PARSER_ARTIFACT_UNQUALIFIED'?message.code:'PARSER_FAILED',message.code==='PARSER_ARTIFACT_UNQUALIFIED'?503:422)));
    worker.once('error',()=>finish(new P6Error('PARSER_FAILED',422)));worker.once('exit',()=>{if(!done)finish(new P6Error('PARSER_EXITED',503));});
  });
}
/** Watchers are invalidation hints only. Every capture re-reads and hashes the authorized root. */
export class ProjectIndex {
  private revision=0;private closed=false;
  private constructor(readonly root:string,private readonly watcher:ReturnType<typeof watch>){}
  static async open(root:string,authorize:()=>Promise<void>){await authorize();await WorkspaceBroker.createSnapshotFromHost(root);const watcher=watch(root,{ignoreInitial:true,followSymlinks:false,depth:100,ignored:entry=>{const rel=path.relative(root,entry).replaceAll('\\','/');return rel!==''&&!publicSourcePath(rel);}});const index=new ProjectIndex(root,watcher);watcher.on('all',()=>index.revision++);watcher.on('error',()=>{index.revision++;index.closed=true;void watcher.close();});return index;}
  async capture(authorize:()=>Promise<void>):Promise<WorkspaceSnapshot>{if(this.closed)throw new P6Error('INDEX_UNAVAILABLE',503);await authorize();const snapshot=await WorkspaceBroker.createSnapshotFromHost(this.root);await authorize();return snapshot;}
  get invalidationRevision(){return this.revision;}
  async close(){this.closed=true;await this.watcher.close();}
}
export async function indexSnapshot(snapshot:WorkspaceSnapshot,files:string[],signal?:AbortSignal){if(files.length>100||new Set(files).size!==files.length)throw new P6Error('INDEX_FILE_LIMIT',400);const output:IndexedFile[]=[];for(const file of files){if(signal?.aborted)throw new P6Error('CONTEXT_CANCELLED',499);if(!publicSourcePath(file))throw new P6Error('SOURCE_EXCLUDED',403);const entry=snapshot.entries.get(file);if(!entry)throw new P6Error('SOURCE_NOT_IN_SNAPSHOT',409);const indexed=await indexSource(file,entry.content.toString('utf8'),signal);if(indexed.sha256!==entry.sha256)throw new P6Error('SOURCE_DIGEST_MISMATCH',409);output.push(indexed);}return{files:output,digest:canonicalDigest(output)};}
