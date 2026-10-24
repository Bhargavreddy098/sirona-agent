import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  $topology,
  $selectedSessionId,
  $selectedLineage,
  $selectedMessages,
  $starmapSearch,
  loadTopology,
  selectSession,
  rewindSession,
  forkNewBranch,
  setStarmapSearch,
} from '../store/starmapStore'
import { api } from '../api/client'

vi.mock('../api/client', () => ({
  api: {
    getSessionTopology: vi.fn(),
    getSessionLineage: vi.fn(),
    getMessages: vi.fn(),
    branchSession: vi.fn(),
    rewindSession: vi.fn(),
    listSessions: vi.fn(),
  },
}))

vi.mock('../store/sessionStore', () => ({
  loadSessions: vi.fn().mockResolvedValue([]),
  openSessionInTab: vi.fn(),
  $sessions: { get: () => [] },
  $activeSessionId: { get: () => 'sess-1' },
}))

vi.mock('../store/messageStore', () => ({
  loadMessages: vi.fn().mockResolvedValue([]),
}))

describe('starmapStore & Lineage Rewind', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    $topology.set(null)
    $selectedSessionId.set(null)
    $selectedLineage.set(null)
    $selectedMessages.set([])
    $starmapSearch.set('')
  })

  it('loads topology and auto-selects the first node', async () => {
    vi.mocked(api.getSessionTopology).mockResolvedValue({
      nodes: [
        {
          id: 'sess-root',
          title: 'Root Session',
          model: 'gemini-2.5-flash',
          started_at: 1000,
          message_count: 4,
        },
        {
          id: 'sess-branch-1',
          title: 'Branch 1',
          model: 'gemini-2.5-flash',
          started_at: 1050,
          message_count: 2,
          parent_session_id: 'sess-root',
          branch_point_id: '2',
        },
      ],
      edges: [
        { source: 'sess-root', target: 'sess-branch-1', branch_point_id: '2' },
      ],
      checkpoints: [],
    })

    vi.mocked(api.getSessionLineage).mockResolvedValue({
      session: {
        id: 'sess-root',
        title: 'Root Session',
        model: 'gemini-2.5-flash',
        started_at: 1000,
        message_count: 4,
        pinned: 0,
        archived: 0,
      },
      ancestors: [],
      children: [],
    })

    vi.mocked(api.getMessages).mockResolvedValue({
      messages: [
        { id: 1, session_id: 'sess-root', role: 'user', content: 'Turn 1', timestamp: 1001 },
      ],
      total: 1,
    })

    const topo = await loadTopology()
    expect(topo?.nodes.length).toBe(2)
    expect($topology.get()?.nodes.length).toBe(2)
    expect($selectedSessionId.get()).toBe('sess-root')
  })

  it('selects session and loads its lineage and messages', async () => {
    vi.mocked(api.getSessionLineage).mockResolvedValue({
      session: {
        id: 'sess-child',
        title: 'Child Branch',
        model: 'gemini-2.5-pro',
        started_at: 2000,
        message_count: 2,
        pinned: 0,
        archived: 0,
      },
      ancestors: [
        {
          id: 'sess-root',
          title: 'Root Session',
          model: 'gemini-2.5-pro',
          started_at: 1000,
          message_count: 5,
          pinned: 0,
          archived: 0,
        },
      ],
      children: [],
    })

    vi.mocked(api.getMessages).mockResolvedValue({
      messages: [
        { id: 10, session_id: 'sess-child', role: 'user', content: 'Question', timestamp: 2001 },
        { id: 11, session_id: 'sess-child', role: 'assistant', content: 'Answer', timestamp: 2002 },
      ],
      total: 2,
    })

    await selectSession('sess-child')
    expect($selectedSessionId.get()).toBe('sess-child')
    expect($selectedLineage.get()?.ancestors.length).toBe(1)
    expect($selectedMessages.get().length).toBe(2)
    expect($selectedMessages.get()[1].content).toBe('Answer')
  })

  it('rewinds session to historical turn', async () => {
    vi.mocked(api.rewindSession).mockResolvedValue({
      success: true,
      session_id: 'sess-root',
      rewound_to: 5,
    })
    vi.mocked(api.getSessionLineage).mockResolvedValue({
      session: {
        id: 'sess-root',
        title: 'Root',
        model: 'gemini-2.5-flash',
        started_at: 1000,
        message_count: 5,
        pinned: 0,
        archived: 0,
      },
      ancestors: [],
      children: [],
    })
    vi.mocked(api.getMessages).mockResolvedValue({ messages: [], total: 0 })
    vi.mocked(api.getSessionTopology).mockResolvedValue({ nodes: [], edges: [], checkpoints: [] })

    const res = await rewindSession('sess-root', 5)
    expect(res).toBe(true)
    expect(api.rewindSession).toHaveBeenCalledWith('sess-root', 5)
  })

  it('forks new branch from specific message checkpoint', async () => {
    vi.mocked(api.branchSession).mockResolvedValue({
      session: {
        id: 'sess-new-fork',
        title: 'Fork of Root',
        model: 'gemini-2.5-flash',
        started_at: 3000,
        message_count: 3,
        pinned: 0,
        archived: 0,
      },
    })
    vi.mocked(api.getSessionTopology).mockResolvedValue({ nodes: [], edges: [], checkpoints: [] })

    const newId = await forkNewBranch('sess-root', 3, 'Fork of Root')
    expect(newId).toBe('sess-new-fork')
    expect(api.branchSession).toHaveBeenCalledWith('sess-root', 3, 'Fork of Root')
    expect($selectedSessionId.get()).toBe('sess-new-fork')
  })

  it('updates starmap search filter', () => {
    setStarmapSearch('optimization')
    expect($starmapSearch.get()).toBe('optimization')
  })
})
