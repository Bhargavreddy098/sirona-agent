import { atom } from 'nanostores'
import { api, type SessionSummary } from '../api/client'

export const $sessions = atom<SessionSummary[]>([])
export const $activeSessionId = atom<string | null>(null)
export const $openSessionTabs = atom<string[]>([])
export const $isLoadingSessions = atom<boolean>(false)

export async function loadSessions(): Promise<void> {
  $isLoadingSessions.set(true)
  try {
    const res = await api.listSessions()
    if (res.sessions.length > 0) {
      $sessions.set(res.sessions)
      if (!$activeSessionId.get()) {
        const firstId = res.sessions[0].id
        $activeSessionId.set(firstId)
        $openSessionTabs.set([firstId])
      }
    } else {
      // Create initial Welcome Session
      const welcomeSess = await createNewSession('Welcome to Sirona', 'gemini-2.5-flash')
      if (welcomeSess) {
        $activeSessionId.set(welcomeSess)
        $openSessionTabs.set([welcomeSess])
        // Post introductory message
        try {
          await api.sendPrompt(
            welcomeSess,
            'Hello Sirona! Please introduce your capabilities as my autonomous developer agent and summarize this codebase architecture.'
          )
        } catch (e) {
          // Non-blocking
        }
      }
    }
  } catch (err) {
    console.error('Failed to load sessions', err)
  } finally {
    $isLoadingSessions.set(false)
  }
}

export function openSessionInTab(sessionId: string): void {
  $activeSessionId.set(sessionId)
  const tabs = $openSessionTabs.get()
  if (!tabs.includes(sessionId)) {
    $openSessionTabs.set([...tabs, sessionId])
  }
}

export function closeSessionTab(sessionId: string, e?: React.MouseEvent): void {
  if (e) e.stopPropagation()
  const tabs = $openSessionTabs.get().filter((id) => id !== sessionId)
  $openSessionTabs.set(tabs)
  if ($activeSessionId.get() === sessionId) {
    if (tabs.length > 0) {
      $activeSessionId.set(tabs[tabs.length - 1])
    } else {
      $activeSessionId.set(null)
    }
  }
}

export async function createNewSession(title?: string, model?: string, cwd?: string): Promise<string | null> {
  try {
    const res = await api.createSession(title, model, cwd)
    $sessions.set([res.session, ...$sessions.get()])
    $activeSessionId.set(res.session.id)
    return res.session.id
  } catch (err) {
    console.error('Failed to create session', err)
    return null
  }
}

export async function togglePinSession(sessionId: string): Promise<void> {
  const current = $sessions.get().find((s) => s.id === sessionId)
  if (!current) return
  const nextPinned = current.pinned === 1 ? 0 : 1
  try {
    await api.updateSession(sessionId, { pinned: nextPinned })
    $sessions.set(
      $sessions.get().map((s) => (s.id === sessionId ? { ...s, pinned: nextPinned } : s))
    )
  } catch (err) {
    console.error('Failed to toggle pin', err)
  }
}

export async function deleteSession(sessionId: string): Promise<void> {
  try {
    await api.deleteSession(sessionId)
    const filtered = $sessions.get().filter((s) => s.id !== sessionId)
    $sessions.set(filtered)
    if ($activeSessionId.get() === sessionId) {
      $activeSessionId.set(filtered.length > 0 ? filtered[0].id : null)
    }
  } catch (err) {
    console.error('Failed to delete session', err)
  }
}
