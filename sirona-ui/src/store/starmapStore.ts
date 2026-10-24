import { atom } from 'nanostores'
import {
  api,
  type SessionTopologyResponse,
  type SessionLineageResponse,
  type MessageRecord,
} from '../api/client'
import { loadSessions, openSessionInTab } from './sessionStore'
import { loadMessages } from './messageStore'

export const $topology = atom<SessionTopologyResponse | null>(null)
export const $selectedSessionId = atom<string | null>(null)
export const $selectedLineage = atom<SessionLineageResponse | null>(null)
export const $selectedMessages = atom<MessageRecord[]>([])
export const $isLoadingTopology = atom<boolean>(false)
export const $isLoadingLineage = atom<boolean>(false)
export const $rewindingMessageId = atom<number | null>(null)
export const $starmapSearch = atom<string>('')

export async function loadTopology(): Promise<SessionTopologyResponse | null> {
  $isLoadingTopology.set(true)
  try {
    const res = await api.getSessionTopology()
    $topology.set(res)
    // If no session selected yet, select the first node
    if (!$selectedSessionId.get() && res.nodes && res.nodes.length > 0) {
      selectSession(res.nodes[0].id)
    }
    return res
  } catch (err) {
    console.warn('[StarmapStore] Failed to load topology:', err)
    return null
  } finally {
    $isLoadingTopology.set(false)
  }
}

export async function selectSession(sessionId: string): Promise<void> {
  $selectedSessionId.set(sessionId)
  $isLoadingLineage.set(true)
  try {
    const [lineageRes, messagesRes] = await Promise.all([
      api.getSessionLineage(sessionId).catch(() => null),
      api.getMessages(sessionId).catch(() => ({ messages: [], total: 0 })),
    ])

    if (lineageRes) {
      $selectedLineage.set(lineageRes)
    }
    if (messagesRes && messagesRes.messages) {
      $selectedMessages.set(messagesRes.messages)
    }
  } catch (err) {
    console.warn(`[StarmapStore] Failed to load details for session ${sessionId}:`, err)
  } finally {
    $isLoadingLineage.set(false)
  }
}

export async function rewindSession(
  sessionId: string,
  toMessageId: number
): Promise<boolean> {
  $rewindingMessageId.set(toMessageId)
  try {
    const res = await api.rewindSession(sessionId, toMessageId)
    if (res.success) {
      // Reload messages for the selected session
      await selectSession(sessionId)
      // Also sync active session messages if active
      await loadMessages(sessionId)
      await loadSessions()
      await loadTopology()
      return true
    }
    return false
  } catch (err) {
    console.error(`[StarmapStore] Failed to rewind session ${sessionId}:`, err)
    return false
  } finally {
    $rewindingMessageId.set(null)
  }
}

export async function forkNewBranch(
  sourceSessionId: string,
  throughMessageId?: number,
  newTitle?: string
): Promise<string | null> {
  try {
    const res = await api.branchSession(sourceSessionId, throughMessageId, newTitle)
    if (res && res.session) {
      await loadSessions()
      await loadTopology()
      openSessionInTab(res.session.id)
      selectSession(res.session.id)
      return res.session.id
    }
    return null
  } catch (err) {
    console.error(`[StarmapStore] Failed to fork branch from ${sourceSessionId}:`, err)
    return null
  }
}

export function setStarmapSearch(query: string): void {
  $starmapSearch.set(query)
}
