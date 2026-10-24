export interface SessionSummary {
  id: string
  title: string
  model: string
  cwd?: string
  started_at: number
  last_activity_at?: number
  message_count: number
  pinned: number
  archived: number
}

export interface MessageRecord {
  id: number
  session_id: string
  role: 'user' | 'assistant' | 'tool' | 'system'
  content?: string
  tool_call_id?: string
  tool_name?: string
  tool_args?: Record<string, any>
  duration_ms?: number
  timestamp: number
  reasoning?: string
  compacted?: number
  interrupted?: boolean
}

export interface SystemStatus {
  cpu_pct: number
  mem_pct: number
  mem_available_mb: number
  gateway: string
  active_runs: number
}

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
    return ''
  }
  return 'http://127.0.0.1:8000'
}

export async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  if (!res.ok) {
    const errorBody = await res.text().catch(() => '')
    throw new Error(`API Error ${res.status}: ${errorBody || res.statusText}`)
  }
  return res.json()
}

export const api = {
  // Health
  getHealth: () => fetchJson<{ status: string; service: string }>('/health'),
  getStatus: () => fetchJson<SystemStatus>('/api/status'),

  // Sessions
  listSessions: (pinned?: boolean, archived?: boolean) => {
    const params = new URLSearchParams()
    if (pinned !== undefined) params.append('pinned', String(pinned))
    if (archived !== undefined) params.append('archived', String(archived))
    return fetchJson<{ sessions: SessionSummary[]; total: number }>(`/api/sessions?${params}`)
  },
  createSession: (title?: string, model?: string, cwd?: string) =>
    fetchJson<{ session: SessionSummary }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title, model, cwd }),
    }),
  getSession: (id: string) => fetchJson<{ session: SessionSummary }>(`/api/sessions/${id}`),
  updateSession: (id: string, updates: Partial<SessionSummary>) =>
    fetchJson<{ session: SessionSummary }>(`/api/sessions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteSession: (id: string) =>
    fetchJson<{ success: boolean; session_id: string }>(`/api/sessions/${id}`, {
      method: 'DELETE',
    }),

  // Messages
  getMessages: (sessionId: string) =>
    fetchJson<{ messages: MessageRecord[]; total: number }>(`/api/sessions/${sessionId}/messages`),

  // Chat
  sendPrompt: (sessionId: string, prompt: string, effort: string = 'medium') =>
    fetchJson<{ success: boolean; response: string; tool_calls: any[] }>(
      `/api/sessions/${sessionId}/chat`,
      {
        method: 'POST',
        body: JSON.stringify({ prompt, reasoning_effort: effort }),
      }
    ),

  // Approvals
  respondApproval: (runId: string, promptId: string, approved: boolean) =>
    fetchJson<{ success: boolean }>(`/v1/runs/${runId}/approval`, {
      method: 'POST',
      body: JSON.stringify({ prompt_id: promptId, approved }),
    }),

  // Models
  getModels: () => fetchJson<{ data: any[] }>('/v1/models'),
  getModelOptions: () => fetchJson<{ models: any[]; reasoning_efforts: string[] }>('/api/model/options'),

  // Capabilities & Tools
  getCapabilities: () => fetchJson<Record<string, boolean>>('/v1/capabilities'),
  getTools: () => fetchJson<{ tools: any[] }>('/v1/toolsets'),
  getSkills: () => fetchJson<{ skills: any[] }>('/v1/skills'),
  executeTool: (toolName: string, args?: Record<string, any>) =>
    fetchJson<{ success: boolean; result?: any; error?: string }>('/api/tools/execute', {
      method: 'POST',
      body: JSON.stringify({ tool_name: toolName, args }),
    }),

  // Branch & Rewind (Hermes-parity lineage)
  branchSession: (sessionId: string, throughMessageId?: number, newTitle?: string) =>
    fetchJson<{ session: SessionSummary }>(`/api/sessions/${sessionId}/branch`, {
      method: 'POST',
      body: JSON.stringify({ through_message_id: throughMessageId, new_title: newTitle }),
    }),
  rewindSession: (sessionId: string, toMessageId: number) =>
    fetchJson<{ success: boolean; session_id: string; rewound_to: number }>(
      `/api/sessions/${sessionId}/rewind`,
      {
        method: 'POST',
        body: JSON.stringify({ to_message_id: toMessageId }),
      }
    ),

  // Full-Text Search across message transcripts
  searchMessages: (query: string, sessionId?: string, limit: number = 50) => {
    const params = new URLSearchParams({ q: query, limit: String(limit) })
    if (sessionId) params.append('session_id', sessionId)
    return fetchJson<{
      results: Array<{
        message_id: number
        session_id: string
        role: string
        content: string
        snippet?: string
      }>
      total: number
    }>(`/api/messages/search?${params}`)
  },

  // Checkpoints
  listCheckpoints: (sessionId: string) =>
    fetchJson<{ checkpoints: any[]; total: number }>(`/api/sessions/${sessionId}/checkpoints`),
  createCheckpoint: (sessionId: string, messageId?: number, summary?: string, stateData?: string) =>
    fetchJson<{ checkpoint: any }>(`/api/sessions/${sessionId}/checkpoints`, {
      method: 'POST',
      body: JSON.stringify({ message_id: messageId, summary, state_data: stateData }),
    }),

  // Projects
  getProjects: () => fetchJson<{ projects: any[] }>('/api/projects'),

  // Workspace Files
  getFileTree: (path = '.', maxDepth = 4) =>
    fetchJson<{ root: string; name: string; tree: any[] }>(`/api/files/tree?path=${encodeURIComponent(path)}&max_depth=${maxDepth}`),
  readWorkspaceFile: (path: string, offset = 0, limit?: number) => {
    const params = new URLSearchParams({ path, offset: String(offset) })
    if (limit) params.append('limit', String(limit))
    return fetchJson<{ path: string; name: string; content: string; total_lines: number; size: number; language: string }>(`/api/files/read?${params}`)
  },
  writeWorkspaceFile: (path: string, content: string, overwrite = true) =>
    fetchJson<{ success: boolean; path: string; bytes_written: number }>('/api/files/write', {
      method: 'POST',
      body: JSON.stringify({ path, content, overwrite }),
    }),
  searchFiles: (query: string, path = '.', limit = 50) =>
    fetchJson<{ query: string; matches: any[]; total: number }>(`/api/files/search?query=${encodeURIComponent(query)}&path=${encodeURIComponent(path)}&limit=${limit}`),
  revealFile: (path: string) =>
    fetchJson<{ revealed: boolean; path: string }>('/api/files/reveal', {
      method: 'POST',
      body: JSON.stringify({ path }),
    }),
}
