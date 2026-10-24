import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  $clarifyRequests,
  $activeClarifyRequest,
  pushClarifyRequest,
  removeClarifyRequest,
  clearClarifyRequestsForSession,
  submitClarifyAnswers,
  skipClarifyRequest,
  normalizeClarifyQuestions,
  isRecommended,
  bareChoice,
} from '../store/clarifyStore'
import { $activeSessionId } from '../store/sessionStore'
import { gateway } from '../api/gateway'

describe('Stage 7: Interactive Questions & Multi-Choice Clarification Protocol', () => {
  const sessionId = 'session-clarify-1'

  beforeEach(() => {
    $clarifyRequests.set({})
    $activeSessionId.set(sessionId)
    vi.restoreAllMocks()
  })

  it('detects and strips recommended label', () => {
    const choice = 'Tailwind CSS (Recommended)'
    expect(isRecommended(choice)).toBe(true)
    expect(bareChoice(choice)).toBe('Tailwind CSS')

    const standardChoice = 'Vanilla CSS'
    expect(isRecommended(standardChoice)).toBe(false)
    expect(bareChoice(standardChoice)).toBe('Vanilla CSS')
  })

  it('normalizes clarify questions correctly', () => {
    const raw = [
      {
        question: 'Which framework?',
        choices: ['React (Recommended)', 'Vue', 'Svelte'],
        multi_select: false,
      },
      {
        qid: 'custom-q2',
        question: 'Select plugins',
        options: ['Auth', 'Database', 'Storage'],
        is_multi_select: true,
      },
      {
        question: '   ', // empty question should be dropped
      },
    ]

    const normalized = normalizeClarifyQuestions(raw)
    expect(normalized).toHaveLength(2)

    expect(normalized[0].qid).toBe('q1')
    expect(normalized[0].question).toBe('Which framework?')
    expect(normalized[0].choices).toEqual(['React (Recommended)', 'Vue', 'Svelte'])
    expect(normalized[0].multiSelect).toBe(false)

    expect(normalized[1].qid).toBe('custom-q2')
    expect(normalized[1].question).toBe('Select plugins')
    expect(normalized[1].choices).toEqual(['Auth', 'Database', 'Storage'])
    expect(normalized[1].multiSelect).toBe(true)
  })

  it('pushes clarify request and activates for session', () => {
    pushClarifyRequest({
      requestId: 'req-101',
      sessionId,
      questions: [
        {
          qid: 'q1',
          question: 'Deploy now?',
          choices: ['Yes (Recommended)', 'No'],
          multiSelect: false,
        },
      ],
    })

    const requests = $clarifyRequests.get()
    expect(Object.keys(requests)).toHaveLength(1)

    const active = $activeClarifyRequest.get()
    expect(active).not.toBeNull()
    expect(active?.requestId).toBe('req-101')
    expect(active?.questions[0].question).toBe('Deploy now?')
  })

  it('submits clarify answers and dispatches over gateway', async () => {
    const respondSpy = vi.spyOn(gateway, 'respondClarify').mockResolvedValue({ ok: true })

    pushClarifyRequest({
      requestId: 'req-101',
      sessionId,
      questions: [
        {
          qid: 'q1',
          question: 'Database?',
          choices: ['SQLite', 'Postgres'],
          multiSelect: false,
        },
      ],
    })

    await submitClarifyAnswers('req-101', { q1: 'SQLite' })

    expect(respondSpy).toHaveBeenCalledWith(sessionId, 'req-101', { q1: 'SQLite' })
    expect($activeClarifyRequest.get()).toBeNull()
  })

  it('skips clarify request and notifies gateway with empty answers', async () => {
    const respondSpy = vi.spyOn(gateway, 'respondClarify').mockResolvedValue({ ok: true })

    pushClarifyRequest({
      requestId: 'req-202',
      sessionId,
      questions: [
        {
          qid: 'q1',
          question: 'Optional question',
          choices: ['A', 'B'],
          multiSelect: false,
        },
      ],
    })

    await skipClarifyRequest('req-202')

    expect(respondSpy).toHaveBeenCalledWith(sessionId, 'req-202', {})
    expect($activeClarifyRequest.get()).toBeNull()
  })

  it('clears clarify requests for specific session', () => {
    pushClarifyRequest({
      requestId: 'req-1',
      sessionId: 'sess-A',
      questions: [{ qid: 'q1', question: 'Q1', choices: null, multiSelect: false }],
    })
    pushClarifyRequest({
      requestId: 'req-2',
      sessionId: 'sess-B',
      questions: [{ qid: 'q2', question: 'Q2', choices: null, multiSelect: false }],
    })

    expect(Object.keys($clarifyRequests.get())).toHaveLength(2)

    clearClarifyRequestsForSession('sess-A')

    const remaining = Object.values($clarifyRequests.get())
    expect(remaining).toHaveLength(1)
    expect(remaining[0].sessionId).toBe('sess-B')

    removeClarifyRequest('req-2', 'sess-B')
    expect(Object.keys($clarifyRequests.get())).toHaveLength(0)
  })
})
