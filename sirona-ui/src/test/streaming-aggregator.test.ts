import { describe, it, expect, beforeEach } from 'vitest'
import {
  $messages,
  $streamingState,
  startStreaming,
  appendStreamToken,
  appendReasoningToken,
  startToolExecution,
  completeToolExecution,
  finishStreaming,
  interruptStreaming,
  resetStreamingState,
  handleStreamEvent,
} from '../store/messageStore'

describe('Stage 5: Streaming Token Aggregator, Reasoning Collapsers & Tool Execution', () => {
  const sessionId = 'test-session-123'

  beforeEach(() => {
    $messages.set([])
    resetStreamingState()
  })

  it('initializes streaming state properly', () => {
    startStreaming(sessionId, 'turn-1')
    const state = $streamingState.get()

    expect(state.isStreaming).toBe(true)
    expect(state.sessionId).toBe(sessionId)
    expect(state.turnId).toBe('turn-1')
    expect(state.currentTokens).toBe('')
    expect(state.currentReasoning).toBe('')
    expect(state.activeTool).toBeNull()
    expect(state.completedTools).toEqual([])
  })

  it('aggregates text token deltas progressively', () => {
    startStreaming(sessionId, 'turn-1')

    appendStreamToken('Hello ')
    appendStreamToken('world! ')
    appendStreamToken('This is Sirona.')

    const state = $streamingState.get()
    expect(state.currentTokens).toBe('Hello world! This is Sirona.')
    expect(state.isStreaming).toBe(true)
    expect(state.isReasoningStreaming).toBe(false)
  })

  it('aggregates reasoning deltas and tracks reasoning streaming flag', () => {
    startStreaming(sessionId, 'turn-1')

    appendReasoningToken('Step 1: Check git status.\n')
    let state = $streamingState.get()
    expect(state.currentReasoning).toBe('Step 1: Check git status.\n')
    expect(state.isReasoningStreaming).toBe(true)

    appendReasoningToken('Step 2: Inspect diff.\n')
    state = $streamingState.get()
    expect(state.currentReasoning).toBe('Step 1: Check git status.\nStep 2: Inspect diff.\n')
    expect(state.isReasoningStreaming).toBe(true)

    // Switching to text stream should set isReasoningStreaming to false
    appendStreamToken('Here is the plan.')
    state = $streamingState.get()
    expect(state.isReasoningStreaming).toBe(false)
    expect(state.currentTokens).toBe('Here is the plan.')
  })

  it('handles tool execution start, completion, and message appending', () => {
    startStreaming(sessionId, 'turn-1')

    startToolExecution('call-abc', 'run_shell', { command: 'git status' })
    let state = $streamingState.get()

    expect(state.activeTool).not.toBeNull()
    expect(state.activeTool?.toolName).toBe('run_shell')
    expect(state.activeTool?.args).toEqual({ command: 'git status' })
    expect(state.activeTool?.status).toBe('running')

    completeToolExecution('call-abc', 'On branch master\nnothing to commit', 45, true)
    state = $streamingState.get()

    expect(state.activeTool).toBeNull()
    expect(state.completedTools).toHaveLength(1)
    expect(state.completedTools[0].toolName).toBe('run_shell')
    expect(state.completedTools[0].result).toBe('On branch master\nnothing to commit')
    expect(state.completedTools[0].durationMs).toBe(45)
    expect(state.completedTools[0].status).toBe('completed')

    // Verify tool message was committed to $messages
    const messages = $messages.get()
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('tool')
    expect(messages[0].tool_name).toBe('run_shell')
    expect(messages[0].content).toBe('On branch master\nnothing to commit')
    expect(messages[0].duration_ms).toBe(45)
  })

  it('finishes streaming and commits assistant message', () => {
    startStreaming(sessionId, 'turn-1')
    appendReasoningToken('Deep thinking process')
    appendStreamToken('Final verified response.')

    finishStreaming()

    const state = $streamingState.get()
    expect(state.isStreaming).toBe(false)
    expect(state.currentTokens).toBe('')

    const messages = $messages.get()
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('assistant')
    expect(messages[0].content).toBe('Final verified response.')
    expect(messages[0].reasoning).toBe('Deep thinking process')
    expect(messages[0].interrupted).toBe(false)
  })

  it('handles turn interruption by tagging interrupted note', () => {
    startStreaming(sessionId, 'turn-1')
    appendStreamToken('Partial sentence before cancellation')

    interruptStreaming()

    const state = $streamingState.get()
    expect(state.isStreaming).toBe(false)

    const messages = $messages.get()
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('assistant')
    expect(messages[0].content).toContain('Partial sentence before cancellation')
    expect(messages[0].content).toContain('*[Turn interrupted by user]*')
    expect(messages[0].interrupted).toBe(true)
  })

  it('handles events through handleStreamEvent wire', () => {
    // 1. message.start
    handleStreamEvent({
      type: 'message.start',
      session_id: sessionId,
      turn_id: 'turn-wire',
    })
    expect($streamingState.get().isStreaming).toBe(true)
    expect($streamingState.get().turnId).toBe('turn-wire')

    // 2. reasoning.delta
    handleStreamEvent({
      type: 'reasoning.delta',
      delta: 'Reasoning chunk',
    })
    expect($streamingState.get().currentReasoning).toBe('Reasoning chunk')

    // 3. message.delta
    handleStreamEvent({
      type: 'message.delta',
      delta: 'Token chunk 1. ',
    })
    expect($streamingState.get().currentTokens).toBe('Token chunk 1. ')

    // 4. JSON-RPC wrapped tool.start
    handleStreamEvent({
      jsonrpc: '2.0',
      method: 'event',
      params: {
        type: 'tool.start',
        tool_name: 'read_file',
        tool_call_id: 'call-101',
        args: { path: 'README.md' },
      },
    })
    expect($streamingState.get().activeTool?.toolName).toBe('read_file')

    // 5. JSON-RPC wrapped tool.complete
    handleStreamEvent({
      jsonrpc: '2.0',
      method: 'event',
      params: {
        type: 'tool.complete',
        tool_call_id: 'call-101',
        result: '# Sirona Agent',
        duration_ms: 12,
      },
    })
    expect($streamingState.get().completedTools).toHaveLength(1)

    // 6. turn.complete
    handleStreamEvent({
      type: 'turn.complete',
      response: 'Token chunk 1. Token chunk 2.',
    })
    expect($streamingState.get().isStreaming).toBe(false)
    expect($messages.get()).toHaveLength(2) // 1 tool message + 1 assistant message
  })
})
