import { createProtocolConnection, InitializeRequest, InitializedNotification, ShutdownRequest, ExitNotification, DidOpenTextDocumentNotification, DidCloseTextDocumentNotification, DefinitionRequest, DocumentSymbolRequest, PublishDiagnosticsNotification } from 'vscode-languageserver-protocol/node'
import type { Diagnostic, InitializeResult, Position, DocumentSymbol, SymbolInformation, Definition, DefinitionLink } from 'vscode-languageserver-protocol'
import { CancellationTokenSource, StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node'
import type { Readable, Writable } from 'node:stream'

// Streams must come from the existing trusted isolation broker. This client never spawns a server.
// URI ownership is checked against exact broker-issued document URIs, not string path prefixes.
export class LanguageClient {
  private connection
  private state: 'new' | 'initializing' | 'ready' | 'closed' = 'new'
  private documents = new Set<string>()
  private pending = new Set<CancellationTokenSource>()
  private diagnostics: (uri: string, items: Diagnostic[]) => void = () => {}
  constructor(input: Readable, output: Writable, private readonly scope: { rootUri: string; documentUris: ReadonlySet<string> }, private readonly timeoutMs = 5000) {
    if (!scope.rootUri.startsWith('file:') || scope.documentUris.size > 10000 || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('Invalid language-client scope or deadline')
    this.scope = { rootUri: scope.rootUri, documentUris: new Set(scope.documentUris) }
    this.connection = createProtocolConnection(new StreamMessageReader(input), new StreamMessageWriter(output))
    this.connection.onNotification(PublishDiagnosticsNotification.type, params => {
      if (this.state === 'ready' && this.documents.has(params.uri)) this.diagnostics(params.uri, params.diagnostics)
    })
    this.connection.onClose(() => this.dispose())
    this.connection.onRequest('workspace/configuration', () => [])
    this.connection.onRequest('workspace/applyEdit', () => ({ applied: false, failureReason: 'Language intelligence is read-only' }))
    this.connection.listen()
  }
  private async bounded<T>(call: (token: CancellationTokenSource['token']) => Promise<T>): Promise<T> {
    if (this.state === 'closed') throw new Error('Language client closed')
    const cancel = new CancellationTokenSource()
    this.pending.add(cancel)
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([call(cancel.token), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { cancel.cancel(); reject(new Error('Language server deadline exceeded')) }, this.timeoutMs)
      })])
    } finally { clearTimeout(timer); this.pending.delete(cancel); cancel.dispose() }
  }
  async initialize(): Promise<InitializeResult> {
    if (this.state !== 'new') throw new Error('Language client already initialized or closed')
    this.state = 'initializing'
    try {
      const result = await this.bounded(token => this.connection.sendRequest(InitializeRequest.type, {
        processId: null, rootUri: this.scope.rootUri,
        capabilities: { workspace: { applyEdit: false }, textDocument: { documentSymbol: { hierarchicalDocumentSymbolSupport: true } } },
        workspaceFolders: [{ uri: this.scope.rootUri, name: 'Sirona workspace' }], clientInfo: { name: 'Sirona' },
      }, token))
      await this.connection.sendNotification(InitializedNotification.type, {})
      this.state = 'ready'
      return result
    } catch (error) { this.dispose(); throw error }
  }
  onDiagnostics(callback: (uri: string, items: Diagnostic[]) => void): () => void {
    this.diagnostics = callback
    return () => { this.diagnostics = () => {} }
  }
  async open(uri: string, languageId: string, text: string, version = 1): Promise<void> {
    if (this.state !== 'ready' || !this.scope.documentUris.has(uri) || this.documents.has(uri)) throw new Error('Document is unavailable or outside broker scope')
    if (Buffer.byteLength(text) > 1024 * 1024 || !Number.isSafeInteger(version) || version < 1) throw new Error('Invalid document bounds')
    this.documents.add(uri)
    await this.connection.sendNotification(DidOpenTextDocumentNotification.type, { textDocument: { uri, languageId, text, version } })
  }
  private assertOpen(uri: string) { if (this.state !== 'ready' || !this.documents.has(uri)) throw new Error('Document is not open') }
  async symbols(uri: string): Promise<DocumentSymbol[] | SymbolInformation[] | null> {
    this.assertOpen(uri)
    return this.bounded(token => this.connection.sendRequest(DocumentSymbolRequest.type, { textDocument: { uri } }, token))
  }
  async definition(uri: string, position: Position): Promise<Definition | DefinitionLink[] | null> {
    this.assertOpen(uri)
    if (!Number.isSafeInteger(position.line) || !Number.isSafeInteger(position.character) || position.line < 0 || position.character < 0) throw new Error('Invalid document position')
    const result = await this.bounded(token => this.connection.sendRequest(DefinitionRequest.type, { textDocument: { uri }, position }, token))
    // Definitions outside the issued scope must not become filesystem links/reads.
    if (!result) return null
    const entries = Array.isArray(result) ? result : [result]
    return entries.filter(item => this.scope.documentUris.has('targetUri' in item ? item.targetUri : item.uri)) as Definition | DefinitionLink[]
  }
  async close(uri: string): Promise<void> {
    this.assertOpen(uri)
    this.documents.delete(uri)
    await this.connection.sendNotification(DidCloseTextDocumentNotification.type, { textDocument: { uri } })
  }
  async shutdown(): Promise<void> {
    if (this.state === 'closed') return
    try {
      await this.bounded(token => this.connection.sendRequest(ShutdownRequest.type, token))
      await this.connection.sendNotification(ExitNotification.type)
    } finally { this.dispose() }
  }
  dispose(): void {
    if (this.state === 'closed') return
    this.state = 'closed'
    for (const token of this.pending) token.cancel()
    this.connection.dispose()
    this.documents.clear()
    this.diagnostics = () => {}
  }
}
