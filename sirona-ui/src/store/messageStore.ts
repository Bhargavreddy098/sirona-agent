import { atom } from 'nanostores'
import { api, type MessageRecord } from '../api/client'

export interface StreamingState {
  isStreaming: boolean
  currentTokens: string
  currentReasoning: string
  activeToolName: string | null
  activeToolArgs: any | null
}

export const $messages = atom<MessageRecord[]>([])
export const $composerDraft = atom<string>('')
export const $streamingState = atom<StreamingState>({
  isStreaming: false,
  currentTokens: '',
  currentReasoning: '',
  activeToolName: null,
  activeToolArgs: null,
})

export async function loadMessages(sessionId: string): Promise<void> {
  try {
    const res = await api.getMessages(sessionId)
    $messages.set(res.messages)
  } catch (err) {
    console.error('Failed to load messages', err)
    $messages.set([])
  }
}

export function appendUserMessage(sessionId: string, content: string): MessageRecord {
  const msg: MessageRecord = {
    id: Date.now(),
    session_id: sessionId,
    role: 'user',
    content,
    timestamp: Date.now() / 1000,
  }
  $messages.set([...$messages.get(), msg])
  return msg
}

export function appendAssistantMessage(sessionId: string, content: string, reasoning?: string): MessageRecord {
  const msg: MessageRecord = {
    id: Date.now(),
    session_id: sessionId,
    role: 'assistant',
    content,
    reasoning,
    timestamp: Date.now() / 1000,
  }
  $messages.set([...$messages.get(), msg])
  return msg
}
