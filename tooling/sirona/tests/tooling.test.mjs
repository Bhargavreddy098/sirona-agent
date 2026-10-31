import { test } from 'node:test'
import assert from 'node:assert/strict'
import { PassThrough } from 'node:stream'
import { spawnSync } from 'node:child_process'
import { createProtocolConnection, InitializeRequest, DocumentSymbolRequest, DefinitionRequest, ShutdownRequest } from 'vscode-languageserver-protocol/node'
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'
import { LanguageClient } from '../dist/lsp.js'
import { backendOrigin, inspectHealth } from '../dist/health.js'

test('health diagnostics use bounded foundation GETs and reject credential/redirect targets', async () => {
  for (const origin of ['https://example.com', 'http://localhost:8000', 'http://user:secret@127.0.0.1', 'http://127.0.0.1/path']) assert.throws(() => backendOrigin(origin))
  const calls = []
  const result = await inspectHealth('http://127.0.0.1:8000', async (url, options) => {
    calls.push(url); assert.equal(options.redirect, 'error'); assert.ok(options.signal)
    return new Response('', { status: url.endsWith('ready') ? 503 : 200 })
  })
  assert.deepEqual(result, { live: true, ready: false })
  assert.deepEqual(calls, ['http://127.0.0.1:8000/health/live', 'http://127.0.0.1:8000/health/ready'])
})

test('LSP uses real framed JSON-RPC, exact scope, read-only edits and graceful shutdown', async () => {
  const toServer = new PassThrough(), toClient = new PassThrough()
  const server = createProtocolConnection(new StreamMessageReader(toServer), new StreamMessageWriter(toClient))
  const uri = 'file:///workspace/a.ts'
  server.onRequest(InitializeRequest.type, () => ({ capabilities: { documentSymbolProvider: true, definitionProvider: true } }))
  server.onRequest(DocumentSymbolRequest.type, () => [{ name: 'answer', kind: 13, location: { uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } } }])
  server.onRequest(DefinitionRequest.type, () => [uri, 'file:///outside/secret'].map(uri => ({ uri, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 6 } } })))
  server.onRequest(ShutdownRequest.type, () => null)
  server.listen()
  const client = new LanguageClient(toClient, toServer, { rootUri: 'file:///workspace', documentUris: new Set([uri]) })
  try {
    await client.initialize()
    await assert.rejects(client.open('file:///outside/secret', 'typescript', 'secret'), /scope/)
    await client.open(uri, 'typescript', 'const answer = 42')
    assert.equal((await client.symbols(uri))[0].name, 'answer')
    assert.equal((await client.definition(uri, { line: 0, character: 0 })).length, 1)
    assert.equal((await server.sendRequest('workspace/applyEdit', {})).applied, false)
    await client.close(uri)
    await assert.rejects(client.symbols(uri), /not open/)
    await client.shutdown()
  } finally { client.dispose(); server.dispose(); toServer.destroy(); toClient.destroy() }
})

test('unresponsive LSP initialization times out and closes', async () => {
  const input = new PassThrough(), output = new PassThrough()
  const client = new LanguageClient(input, output, { rootUri: 'file:///workspace', documentUris: new Set() }, 30)
  await assert.rejects(client.initialize(), /deadline/)
  await assert.rejects(client.initialize(), /closed/)
  input.destroy(); output.destroy()
})

test('native isolate evaluates JSON and enforces CPU timeout without host globals', () => {
  const script = `import { evaluateTrustedQualification as run } from './dist/isolate-worker.js';
    import assert from 'node:assert/strict';
    const input = source => ({source, memoryMb: 16, timeoutMs: 20});
    assert.equal(run(input('return 6*7')), '42');
    assert.equal(run(input('return [typeof process, typeof require, typeof fetch]')), '["undefined","undefined","undefined"]');
    assert.throws(() => run(input('while(true) {}')), /timed out/);
    assert.throws(() => run(input('return "x".repeat(70000)')), /bounded/);
    assert.throws(() => run({...input('return 1'), memoryMb: 1000}), /limits/);`
  const result = spawnSync(process.execPath, ['--no-node-snapshot', '--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), encoding: 'utf8', timeout: 10000, windowsHide: true })
  assert.equal(result.status, 0, result.stderr)
})

test('Commander exposes status and requested TUI without starting a terminal for help', () => {
  const result = spawnSync(process.execPath, ['dist/cli.js', '--help'], { cwd: new URL('..', import.meta.url), encoding: 'utf8', windowsHide: true })
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /status/); assert.match(result.stdout, /tui/)
})

test('requested Pi renderer runs and restores the terminal through its real lifecycle', async () => {
  const { TuiMainScreen, Text } = await import('@earendil-works/pi-tui')
  let started = false, stopped = false, output = ''
  const terminal = {
    columns: 80, rows: 24, kittyProtocolActive: false,
    start() { started = true }, stop() { stopped = true },
    write(text) { output += text }, async drainInput() {}, moveBy() {},
    hideCursor() {}, showCursor() {}, clearLine() {}, clearFromCursor() {},
    clearScreen() {}, setTitle() {}, setProgress() {}, setProgramStatus() {},
  }
  const tui = new TuiMainScreen(terminal)
  tui.addChild(new Text('Sirona runtime monitor'))
  try {
    tui.start(); tui.requestRender()
    await new Promise(resolve => setTimeout(resolve, 50))
    assert.equal(started, true)
    assert.match(output, /Sirona runtime monitor/)
  } finally { tui.stop() }
  assert.equal(stopped, true)
})
