import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {parentPort,workerData} from 'node:worker_threads';
import {Parser,Language,type Node as SyntaxNode} from 'web-tree-sitter';
import {P6Error} from '../tools/toolContracts.js';
import {indexedFileSchema,type IndexedFile} from './contextContracts.js';
const require=createRequire(import.meta.url);
const base=path.dirname(require.resolve('tree-sitter-javascript/package.json'));
const tsBase=path.dirname(require.resolve('tree-sitter-typescript/package.json'));
const catalog={javascript:path.join(base,'tree-sitter-javascript.wasm'),typescript:path.join(tsBase,'tree-sitter-typescript.wasm'),tsx:path.join(tsBase,'tree-sitter-tsx.wasm'),sql:path.resolve(base,'../../../tooling/sirona/parsers/tree-sitter-sql.wasm')};
const qualified:Partial<Record<keyof typeof catalog,string>>={javascript:'5fb488d0cabb4775a594bab85682de5ad6ce83c0d6ac997a9f82dd084d571240',typescript:'778025db5a8be0e70f8ccc3671e486dfeddd048c25d9e8a70c26de2e1bf6f97d',tsx:'79e5da75ea62855a0cd67177685f0164eac87d5f630b3cbe1e0a099751ad30f8'};
export function parserArtifact(language:keyof typeof catalog){const file=catalog[language];if(!qualified[language]||!fs.existsSync(file))throw new P6Error('PARSER_ARTIFACT_UNQUALIFIED',503);const sha256=crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');if(sha256!==qualified[language])throw new P6Error('PARSER_ARTIFACT_CHANGED',503);return{file,sha256};}
const definitions=new Set(['function_declaration','function_expression','class_declaration','method_definition','interface_declaration','type_alias_declaration','enum_declaration','variable_declarator','create_table_statement','create_function_statement']);
const imports=new Set(['import_statement','import_declaration','export_statement']);
export async function parseSource(file:string,source:string,language:keyof typeof catalog):Promise<IndexedFile>{
  if(Buffer.byteLength(source)>1048576||source.includes('\0'))throw new P6Error('SOURCE_LIMIT',413);
  // V8 worker heap limits do not bound WebAssembly linear memory. Supply its
  // separate hard maximum instead of the runtime's default 2 GiB maximum.
  const artifact=parserArtifact(language);await Parser.init({wasmMemory:new WebAssembly.Memory({initial:512,maximum:1024})});const parser=new Parser();let tree:ReturnType<Parser['parse']>=null;
  try{parser.setLanguage(await Language.load(artifact.file));tree=parser.parse(source);if(!tree)throw new P6Error('PARSE_FAILED',422);
    const symbols:IndexedFile['symbols']=[],warnings:IndexedFile['warnings']=[];if(tree.rootNode.hasError)warnings.push('PARSE_ERRORS');
    const pending:SyntaxNode[]=[tree.rootNode];let visited=0;
    while(pending.length){if(++visited>100000)throw new P6Error('PARSE_NODE_LIMIT',413);const node=pending.pop()!;
      if(definitions.has(node.type)||(imports.has(node.type)&&(node.type!=='export_statement'||node.childForFieldName('source')))){if(symbols.length===2000){warnings.push('SYMBOL_LIMIT');break;}const name=node.childForFieldName('name')??node.childForFieldName('source');symbols.push({name:(name?.text??node.text).slice(0,512),kind:imports.has(node.type)?'import':'definition',startLine:node.startPosition.row+1,endLine:node.endPosition.row+1});}
      for(let i=node.namedChildCount-1;i>=0;i--){const child=node.namedChild(i);if(child)pending.push(child);}
    }
    return indexedFileSchema.parse({path:file,sha256:crypto.createHash('sha256').update(source).digest('hex'),parserDigest:artifact.sha256,language,symbols,warnings});
  }finally{tree?.delete();parser.delete();}
}
if(parentPort){const port=parentPort;void parseSource(workerData.path,workerData.source,workerData.language).then(result=>port.postMessage({ok:true,result}),error=>port.postMessage({ok:false,code:error instanceof P6Error?error.code:'PARSER_FAILED'}));}
