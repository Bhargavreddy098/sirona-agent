import test from 'node:test';
import assert from 'node:assert/strict';
import {readRunEvents} from '../src/api/run-events.mjs';
function stream(text,chunk=7){const bytes=new TextEncoder().encode(text);return new Response(new ReadableStream({start(controller){for(let offset=0;offset<bytes.length;offset+=chunk)controller.enqueue(bytes.slice(offset,offset+chunk));controller.close();}}));}
const signal=()=>new AbortController().signal;
test('run SSE preserves named events, split UTF-8 and 64-bit decimal cursors',async()=>{
 const events=[];await assert.rejects(readRunEvents(stream('id: 9007199254740993\r\nevent: graph.approval_required\r\ndata: {"note":"🙂"}\r\n\r\n'),event=>events.push(event),signal()),/connection ended/);
 assert.deepEqual(events,[{id:'9007199254740993',type:'graph.approval_required',payload:{note:'🙂'}}]);
});
test('run SSE discards replayed IDs and comments without inventing events',async()=>{
 const events=[];const input=': ping\n\nid: 40\nevent: graph.old\ndata: {}\n\nid: 41\nevent: graph.new\ndata: {}\n\nid: 41\nevent: graph.duplicate\ndata: {}\n\n';
 await assert.rejects(readRunEvents(stream(input),event=>events.push(event),signal(),'40'),/connection ended/);assert.deepEqual(events.map(event=>event.type),['graph.new']);
});
test('run SSE rejects malformed cursor, oversized payload and named server errors',async()=>{
 for(const [input,pattern]of [['id: nope\nevent: graph.bad\ndata: {}\n\n',/invalid event cursor/],['id: 9223372036854775808\ndata: {}\n\n',/invalid event cursor/],['event: error\ndata: {"code":"STREAM_UNAVAILABLE"}\n\n',/Run stream unavailable/],['data: '+ 'x'.repeat(262145)+'\n\n',/preview limit/]])await assert.rejects(readRunEvents(stream(input,4096),()=>assert.fail('Invalid frame must not be delivered'),signal()),pattern);
});
