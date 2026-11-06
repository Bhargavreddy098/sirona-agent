import {test} from 'node:test';
import assert from 'node:assert/strict';
import {gitCommand} from '../src/tools/gitAdapter.js';
import {searchCommand,parseSearchOutput} from '../src/tools/searchAdapter.js';

test('P6 Git is restricted to read operations with literal paths, hooks/helpers/network disabled',()=>{
 for(const operation of ['commit','push','fetch','reset','checkout','merge'])assert.throws(()=>gitCommand({operation}));
 const diff=gitCommand({operation:'diff',files:['src/actual.ts']});assert.ok(diff.argv.includes('--literal-pathspecs'));assert.ok(diff.argv.includes('--no-ext-diff'));assert.ok(diff.argv.includes('--no-textconv'));assert.ok(diff.argv.includes('core.hooksPath=/dev/null'));assert.ok(diff.argv.includes('protocol.allow=never'));assert.equal(diff.environment.GIT_TERMINAL_PROMPT,'0');assert.equal(diff.argv.at(-1),'src/actual.ts');
 assert.throws(()=>gitCommand({operation:'diff',files:['../private']}));assert.throws(()=>gitCommand({operation:'log',limit:51}));assert.throws(()=>gitCommand({operation:'status',command:'push'}));
});
test('P6 ripgrep arguments treat query literally and bound validated search results',()=>{
 const command=searchCommand({query:'--pre=malicious',files:['src/actual.ts'],maxMatches:1});assert.equal(command.argv[command.argv.indexOf('--')+1],'--pre=malicious');assert.ok(command.argv.includes('--no-config'));assert.ok(command.argv.includes('--fixed-strings'));
 assert.throws(()=>searchCommand({query:'secret',files:['.env']}));
 const frame=JSON.stringify({type:'match',data:{path:{text:'src/actual.ts'},lines:{text:'actual\n'},line_number:1}});const result=parseSearchOutput(frame+'\n'+frame,1);assert.equal(result.matches.length,1);assert.equal(result.truncated,true);
 assert.throws(()=>parseSearchOutput(JSON.stringify({type:'match',data:{path:{text:'../outside'},lines:{text:'bad'},line_number:1}}),1));
});
