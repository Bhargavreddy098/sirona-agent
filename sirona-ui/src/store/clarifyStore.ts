import { atom, computed } from 'nanostores'
import { $activeSessionId } from './sessionStore'
import { gateway } from '../api/gateway'

export interface ClarifyQuestion {
  qid: string
  question: string
  choices: string[] | null
  multiSelect: boolean
}

export interface ClarifyRequest {
  requestId: string
  sessionId: string
  questions: ClarifyQuestion[]
  createdAt?: number
}

export const RECOMMENDED_LABEL = '(Recommended)'

export function isRecommended(choice: string): boolean {
  return choice.includes(RECOMMENDED_LABEL)
}

export function bareChoice(choice: string): string {
  return choice.replace(RECOMMENDED_LABEL, '').trim()
}

export function normalizeClarifyQuestions(rawQuestions: any): ClarifyQuestion[] {
  if (!Array.isArray(rawQuestions)) return []

  return rawQuestions
    .filter((q) => q && typeof q === 'object')
    .map((q, idx) => {
      const qid = String(q.qid || `q${idx + 1}`)
      const question = String(q.question || '')
      const rawChoices = q.choices || q.options
      const choices = Array.isArray(rawChoices)
        ? rawChoices.map(String).filter((c) => c.trim().length > 0)
        : null
      const multiSelect = Boolean(q.multiSelect || q.multi_select || q.is_multi_select || false)

      return {
        qid,
        question,
        choices: choices && choices.length > 0 ? choices : null,
        multiSelect,
      }
    })
    .filter((q) => q.question.trim().length > 0)
}

export const $clarifyRequests = atom<Record<string, ClarifyRequest>>({})

export const $activeClarifyRequest = computed(
  [$clarifyRequests, $activeSessionId],
  (requests, activeId) => {
    if (!activeId) return Object.values(requests)[0] || null
    return requests[activeId] || Object.values(requests).find((r) => r.sessionId === activeId) || null
  }
)

export function pushClarifyRequest(req: ClarifyRequest): void {
  const current = $clarifyRequests.get()
  const key = req.sessionId || req.requestId
  $clarifyRequests.set({
    ...current,
    [key]: req,
  })
}

export function removeClarifyRequest(requestId: string, sessionId?: string): void {
  const current = $clarifyRequests.get()
  const updated: Record<string, ClarifyRequest> = {}
  for (const [k, v] of Object.entries(current)) {
    if (v.requestId !== requestId && (sessionId === undefined || v.sessionId !== sessionId)) {
      updated[k] = v
    }
  }
  $clarifyRequests.set(updated)
}

export function clearClarifyRequestsForSession(sessionId: string): void {
  const current = $clarifyRequests.get()
  const updated: Record<string, ClarifyRequest> = {}
  for (const [k, v] of Object.entries(current)) {
    if (v.sessionId !== sessionId && k !== sessionId) {
      updated[k] = v
    }
  }
  $clarifyRequests.set(updated)
}

export async function submitClarifyAnswers(
  requestId: string,
  answers: Record<string, string | string[]>
): Promise<void> {
  const activeReq = Object.values($clarifyRequests.get()).find((r) => r.requestId === requestId)
  const sessionId = activeReq?.sessionId || $activeSessionId.get() || ''

  removeClarifyRequest(requestId, sessionId)

  try {
    await gateway.respondClarify(sessionId, requestId, answers)
  } catch (err) {
    console.error('Failed to submit clarification answers', err)
  }
}

export async function skipClarifyRequest(requestId: string): Promise<void> {
  const activeReq = Object.values($clarifyRequests.get()).find((r) => r.requestId === requestId)
  const sessionId = activeReq?.sessionId || $activeSessionId.get() || ''

  removeClarifyRequest(requestId, sessionId)

  try {
    await gateway.respondClarify(sessionId, requestId, {})
  } catch (err) {
    console.warn('Failed to skip clarify request', err)
  }
}
