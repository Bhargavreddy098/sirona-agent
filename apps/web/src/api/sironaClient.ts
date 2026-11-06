/**
 * Sirona Frontend Canonical API Client
 * Comprehensive typed client covering all 148 backend routes across 15 domains
 * Reconciled against `apps/server/tests/routeInventory.js` and `docs/frontend-route-coverage.md`.
 */

export interface ProblemDetails {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  code?: string;
  instance?: string;
  errors?: Record<string, string[]>;
}

export class SironaApiError extends Error {
  public status: number;
  public code?: string;
  public details?: ProblemDetails;

  constructor(message: string, status: number, details?: ProblemDetails) {
    super(message);
    this.name = "SironaApiError";
    this.status = status;
    this.code = details?.code;
    this.details = details;
  }
}

let csrfTokenCache: string | null = null;

export function setCsrfToken(token: string | null) {
  csrfTokenCache = token;
}

export function getCsrfToken(): string | null {
  return csrfTokenCache;
}

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  signal?: AbortSignal;
}

async function request<T>(path: string, config: RequestConfig = {}): Promise<T> {
  const method = (config.method || "GET").toUpperCase();
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...config.headers,
  };

  if (config.body !== undefined && !(config.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  // Attach CSRF token on mutating requests
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method) && csrfTokenCache) {
    headers["X-CSRF-Token"] = csrfTokenCache;
  }

  const res = await fetch(path, {
    method,
    headers,
    body:
      config.body !== undefined
        ? config.body instanceof FormData
          ? config.body
          : JSON.stringify(config.body)
        : undefined,
    signal: config.signal,
    credentials: "include",
  });

  if (!res.ok) {
    let errorDetails: ProblemDetails | undefined;
    try {
      errorDetails = await res.json();
    } catch {}
    throw new SironaApiError(
      errorDetails?.detail || errorDetails?.title || `Request failed with status ${res.status}`,
      res.status,
      errorDetails
    );
  }

  if (res.status === 204) {
    return {} as T;
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json") || contentType.includes("application/problem+json")) {
    return res.json() as Promise<T>;
  }

  return res.text() as unknown as Promise<T>;
}

// -------------------------------------------------------------
// 1. Identity, Session & Workspace
// -------------------------------------------------------------
export const identityApi = {
  bootstrap: async (body: { challenge?: string; clientNonce?: string } = {}) => {
    if (typeof (window as any)?.sirona?.bootstrap === "function") {
      try {
        const data = await (window as any).sirona.bootstrap();
        if (data?.csrfToken) setCsrfToken(data.csrfToken);
        return { data };
      } catch (err) {
        console.warn("[Sirona] Desktop bootstrap fallback:", err);
      }
    }
    return request<{ data: { principalId: string; workspaceId: string; csrfToken: string } }>(
      "/api/v1/session/bootstrap",
      { method: "POST", body }
    ).then((res) => {
      if (res?.data?.csrfToken) setCsrfToken(res.data.csrfToken);
      return res;
    });
  },
  session: () =>
    request<{ data: { principalId: string; workspaceId: string } }>("/api/v1/session"),
  logout: () =>
    request<{ ok: boolean }>("/api/v1/session", { method: "DELETE" }),
  workspaces: () =>
    request<{ data: Array<{ id: string; name: string; isDefault?: boolean }> }>("/api/v1/workspaces"),
  capabilities: () =>
    request<{ data: Record<string, boolean> }>("/api/v1/capabilities"),
};

// -------------------------------------------------------------
// 2. Conversations & Messaging
// -------------------------------------------------------------
export const conversationsApi = {
  list: (scope: string = "standalone") =>
    request<{ data: { sessions: Array<{ id: string; title: string; model?: string; last_activity_at?: string; created_at?: string }> } | Array<{ id: string; title: string; model?: string }> }>(
      `/api/v1/conversations?scope=${scope}`
    ).then((res) => {
      // Normalize whether server replied with { sessions: [...] } or array
      const sessions = (res as any)?.data?.sessions || (Array.isArray(res?.data) ? res.data : []);
      return { data: sessions };
    }),
  create: (body: { title?: string; modelId?: string; model?: string; projectId?: string }) => {
    const payload = {
      title: body.title || "New chat",
      modelId: body.modelId || body.model || "gemini-2.5-flash-lite",
      projectId: body.projectId || null,
    };
    return request<{ data: { conversation: { id: string; title: string; model?: string } } }>("/api/v1/conversations", {
      method: "POST",
      body: payload,
    });
  },
  get: (id: string) =>
    request<{ data: { id: string; title: string; model?: string } }>(`/api/v1/conversations/${id}`),
  update: (id: string, body: { title?: string; model?: string; modelId?: string }) =>
    request<{ data: { id: string; title: string; model?: string } }>(`/api/v1/conversations/${id}`, {
      method: "PATCH",
      body: { title: body.title, modelId: body.modelId || body.model },
    }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/conversations/${id}`, { method: "DELETE" }),
  messages: (id: string) =>
    request<{ data: Array<{ id: string; role: string; content: string; status?: string; created_at?: string; createdAt?: number }> }>(
      `/api/v1/conversations/${id}/messages`
    ),
  postMessage: (id: string, body: { content: string; role?: string }) =>
    request<{ data: { id: string; role: string; content: string } }>(
      `/api/v1/conversations/${id}/messages`,
      { method: "POST", body }
    ),
  streamTurns: (
    id: string,
    body: { prompt: string; model?: string; modelId?: string; clientTurnId?: string; projectId?: string },
    callbacks: {
      onToken?: (text: string) => void;
      onError?: (err: any) => void;
      onDone?: (result?: any) => void;
    }
  ) => {
    const controller = new AbortController();
    const effectiveTurnId =
      body.clientTurnId ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : "00000000-0000-4000-8000-" + Date.now().toString().padStart(12, "0").slice(-12));

    const payload = {
      coordinateLease: true,
      prompt: body.prompt,
      modelId: body.modelId || body.model || "gemini-2.5-flash-lite",
      clientTurnId: effectiveTurnId,
      projectId: body.projectId || null,
    };

    fetch(`/api/v1/conversations/${id}/turns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...(csrfTokenCache ? { "X-CSRF-Token": csrfTokenCache } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          let errDetail = `Turn stream failed with status ${res.status}`;
          try {
            const errJson = await res.json();
            errDetail = errJson?.detail || errJson?.error || errJson?.title || errDetail;
          } catch {}
          throw new Error(errDetail);
        }
        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue; // heartbeat or empty
            if (trimmed.startsWith("data: ")) {
              const dataStr = trimmed.slice(6).trim();
              if (dataStr === "[DONE]") {
                callbacks.onDone?.();
                return;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.type === "token") {
                  callbacks.onToken?.(parsed.token || "");
                } else if (parsed.type === "done") {
                  callbacks.onDone?.(parsed);
                } else if (parsed.type === "error") {
                  callbacks.onError?.(new Error(parsed.error || "Turn execution failed"));
                } else if (parsed.delta || parsed.text) {
                  callbacks.onToken?.(parsed.delta || parsed.text || "");
                }
              } catch {
                callbacks.onToken?.(dataStr);
              }
            }
          }
        }
        callbacks.onDone?.();
      })
      .catch((err) => {
        callbacks.onError?.(err);
      });
    return () => controller.abort();
  },
};

// -------------------------------------------------------------
// 3. Projects, Files & Artifacts
// -------------------------------------------------------------
export const projectsApi = {
  list: () =>
    request<{ data: { projects: Array<{ id: string; name: string; canonical: string; primary_path?: string; updatedAt?: number }>; total: number } }>(
      "/api/v1/projects"
    ),
  create: (body: { name: string; directory?: string; primaryPath?: string; description?: string }) =>
    request<{ data: { project: { id: string; name: string; canonical?: string; primary_path?: string } } }>("/api/v1/projects", { method: "POST", body }),
  get: (id: string) =>
    request<{ data: { project: { id: string; name: string; canonical: string; primary_path?: string } } }>(`/api/v1/projects/${id}`),
  update: (id: string, body: { name?: string; directory?: string; primary_path?: string; description?: string }) =>
    request<{ data: { project: { id: string; name: string } } }>(`/api/v1/projects/${id}`, {
      method: "PATCH",
      body,
    }),
  archive: (id: string) =>
    request<{ data: { project: any } }>(`/api/v1/projects/${id}/archive`, { method: "POST" }),
  conversations: (id: string) =>
    request<{ data: Array<{ id: string; title: string }> }>(`/api/v1/projects/${id}/conversations`),
  snapshots: (id: string) =>
    request<{ data: Array<{ id: string; hash: string; createdAt: number }> }>(
      `/api/v1/projects/${id}/snapshots`
    ),
  createSnapshot: (id: string, body: { message?: string } = {}) =>
    request<{ data: { id: string; hash: string } }>(`/api/v1/projects/${id}/snapshots`, {
      method: "POST",
      body,
    }),
  artifacts: (id: string) =>
    request<{ data: Array<{ id: string; path: string; size: number }> }>(
      `/api/v1/projects/${id}/artifacts`
    ),
  artifact: (id: string) =>
    request<{ data: { id: string; path: string; content?: string } }>(`/api/v1/artifacts/${id}`),
  artifactContent: (id: string) => request<string>(`/api/v1/artifacts/${id}/content`),
  upload: (id: string, formData: FormData) =>
    request<{ data: { id: string; filename: string } }>(`/api/v1/projects/${id}/uploads`, {
      method: "POST",
      body: formData,
    }),
  scan: (id: string) =>
    request<{ data: { filesCount: number; durationMs: number } }>(`/api/v1/projects/${id}/scan`, {
      method: "POST",
    }),
  structure: (id: string) =>
    request<{ data: Array<{ path: string; type: "file" | "directory" }> }>(
      `/api/v1/projects/${id}/structure`
    ),
};

// -------------------------------------------------------------
// 4. Workspace & Sandboxed Docker Runtime
// -------------------------------------------------------------
export const workspaceApi = {
  readiness: (projectId: string) =>
    request<{ data: { ready: boolean; docker: boolean; wsl: boolean } }>(
      `/api/v1/projects/${projectId}/workspace-readiness`
    ),
  registerRoot: (projectId: string, body: { rootPath: string }) =>
    request<{ ok: boolean }>(`/api/v1/projects/${projectId}/workspace-root`, {
      method: "POST",
      body,
    }),
  qualifyDocker: (projectId: string) =>
    request<{ data: { qualified: boolean; details?: string } }>(
      `/api/v1/projects/${projectId}/isolation/docker-qualification`,
      { method: "POST" }
    ),
  workers: (projectId: string) =>
    request<{ data: Array<{ id: string; containerId: string; status: string }> }>(
      `/api/v1/projects/${projectId}/docker-workers`
    ),
  recoverWorkers: (projectId: string) =>
    request<{ ok: boolean }>(`/api/v1/projects/${projectId}/docker-workers/recover`, {
      method: "POST",
    }),
  patchPreview: (projectId: string, patchId: string) =>
    request<{ data: { id: string; diff: string; hash: string } }>(
      `/api/v1/projects/${projectId}/patch-previews/${patchId}`
    ),
  applyPatch: (projectId: string, patchId: string) =>
    request<{ ok: boolean }>(`/api/v1/projects/${projectId}/patch-previews/${patchId}/apply`, {
      method: "POST",
    }),
  reconcilePatch: (projectId: string, effectId: string) =>
    request<{ ok: boolean }>(`/api/v1/projects/${projectId}/patch-effects/${effectId}/reconcile`, {
      method: "POST",
    }),
  createTerminal: (projectId: string, body: { shell?: string; env?: Record<string, string> } = {}) =>
    request<{ data: { id: string; ptyId: string } }>(`/api/v1/projects/${projectId}/terminals`, {
      method: "POST",
      body,
    }),
  prepareTerminal: (projectId: string, body: { command: string }) =>
    request<{ data: { id: string; token: string } }>(
      `/api/v1/projects/${projectId}/terminal-preparations`,
      { method: "POST", body }
    ),
  openTerminal: (projectId: string, prepId: string) =>
    request<{ data: { id: string; wsUrl: string } }>(
      `/api/v1/projects/${projectId}/terminal-preparations/${prepId}/open`,
      { method: "POST" }
    ),
  prepareTerminalInput: (terminalId: string, body: { input: string }) =>
    request<{ ok: boolean }>(`/api/v1/terminals/${terminalId}/input-preparations`, {
      method: "POST",
      body,
    }),
  terminalTicket: (terminalId: string) =>
    request<{ data: { ticket: string; expiresAt: number } }>(
      `/api/v1/terminals/${terminalId}/ticket`,
      { method: "POST" }
    ),
  closeTerminal: (terminalId: string) =>
    request<{ ok: boolean }>(`/api/v1/terminals/${terminalId}`, { method: "DELETE" }),
  browseDirectories: (directory?: string) =>
    request<{ data: Array<{ name: string; path: string; isDirectory: boolean }> }>(
      `/api/v1/fs/directories${directory ? `?directory=${encodeURIComponent(directory)}` : ""}`
    ),
};

// -------------------------------------------------------------
// 5. Execution & Runs
// -------------------------------------------------------------
export const executionApi = {
  runs: (projectId: string) =>
    request<{ data: Array<{ id: string; status: string; startedAt: number }> }>(
      `/api/v1/projects/${projectId}/runs`
    ),
  run: (runId: string) =>
    request<{ data: { id: string; status: string; goalId?: string } }>(`/api/v1/runs/${runId}`),
  tasks: (runId: string) =>
    request<{ data: Array<{ id: string; name: string; status: string; step: number }> }>(
      `/api/v1/runs/${runId}/tasks`
    ),
  agents: (runId: string) =>
    request<{ data: Array<{ id: string; role: string; status: string }> }>(
      `/api/v1/runs/${runId}/agents`
    ),
  effects: (runId: string) =>
    request<{ data: Array<{ id: string; type: string; details: any }> }>(
      `/api/v1/runs/${runId}/effects`
    ),
  checkpoints: (runId: string) =>
    request<{ data: Array<{ id: string; step: number; state: any }> }>(
      `/api/v1/runs/${runId}/checkpoints`
    ),
  control: (runId: string, action: "pause" | "resume" | "cancel") =>
    request<{ ok: boolean }>(`/api/v1/runs/${runId}/${action}`, { method: "POST" }),
  execute: (runId: string, body: { step?: number; action?: string } = {}) =>
    request<{ data: { status: string } }>(`/api/v1/runs/${runId}/execute`, {
      method: "POST",
      body,
    }),
  reconcileEffect: (effectId: string, body: { resolution: string }) =>
    request<{ ok: boolean }>(`/api/v1/effects/${effectId}/reconcile`, { method: "POST", body }),
  preparedApproval: (runId: string, body: { action: string; metadata?: any }) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/runs/${runId}/approval-requests`, {
      method: "POST",
      body,
    }),
  events: (runId: string) =>
    new EventSource(`/api/v1/runs/${runId}/events`),
  startGoalRun: (goalId: string, body: { config?: any } = {}) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/goals/${goalId}/runs`, {
      method: "POST",
      body,
    }),
  failures: (runId: string) =>
    request<{ data: Array<{ id: string; error: string; timestamp: number }> }>(
      `/api/v1/runs/${runId}/failures`
    ),
  repairs: (runId: string) =>
    request<{ data: Array<{ id: string; strategy: string; resolved: boolean }> }>(
      `/api/v1/runs/${runId}/repairs`
    ),
  triggerRepair: (runId: string, body: { issueId?: string } = {}) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/runs/${runId}/repairs`, {
      method: "POST",
      body,
    }),
};

// -------------------------------------------------------------
// 6. Governance, Approvals & Leases
// -------------------------------------------------------------
export const governanceApi = {
  currentPolicy: () =>
    request<{ data: { id: string; version: string; rules: any } }>("/api/v1/policies/current"),
  createPolicyRevision: (body: { rules: any; description?: string }) =>
    request<{ data: { id: string; version: string } }>("/api/v1/policies/revisions", {
      method: "POST",
      body,
    }),
  activatePolicy: (policyId: string) =>
    request<{ ok: boolean }>(`/api/v1/policies/${policyId}/activate`, { method: "POST" }),
  grants: (projectId: string) =>
    request<{ data: Array<{ id: string; capability: string; granted: boolean }> }>(
      `/api/v1/projects/${projectId}/grants`
    ),
  createGrant: (projectId: string, body: { capability: string }) =>
    request<{ data: { id: string; capability: string } }>(`/api/v1/projects/${projectId}/grants`, {
      method: "POST",
      body,
    }),
  revokeGrant: (grantId: string) =>
    request<{ ok: boolean }>(`/api/v1/grants/${grantId}/revoke`, { method: "POST" }),
  contractApproval: (revisionId: string, body: { comment?: string } = {}) =>
    request<{ data: { id: string; status: string } }>(
      `/api/v1/contract-revisions/${revisionId}/approval-requests`,
      { method: "POST", body }
    ),
  approvals: () =>
    request<{ data: Array<{ id: string; title: string; risk: string; status: string }> }>(
      "/api/v1/approvals"
    ),
  approval: (id: string) =>
    request<{ data: { id: string; title: string; diff?: string; status: string } }>(
      `/api/v1/approvals/${id}`
    ),
  decide: (id: string, decision: "approve" | "reject", comment?: string) =>
    request<{ ok: boolean }>(`/api/v1/approvals/${id}/decisions`, {
      method: "POST",
      body: { decision, comment },
    }),
  revokeApproval: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/approvals/${id}/revoke`, { method: "POST" }),
  budgets: (projectId: string) =>
    request<{ data: { maxTokens: number; usedTokens: number; costLimit: number } }>(
      `/api/v1/projects/${projectId}/budgets`
    ),
  setBudget: (projectId: string, body: { maxTokens?: number; costLimit?: number }) =>
    request<{ ok: boolean }>(`/api/v1/projects/${projectId}/budgets`, { method: "POST", body }),
  reserveBudget: (budgetId: string, body: { tokens: number }) =>
    request<{ data: { reservationId: string } }>(`/api/v1/budgets/${budgetId}/reserve`, {
      method: "POST",
      body,
    }),
  usage: () =>
    request<{ data: { totalTokens: number; totalCost: number; byModel: Record<string, number> } }>(
      "/api/v1/usage"
    ),
  acquireLease: (sessionId: string) =>
    request<{ data: { leaseId: string; expiresAt: number } }>(
      `/api/v1/sessions/${sessionId}/lease`,
      { method: "POST" }
    ),
  releaseLease: (sessionId: string) =>
    request<{ ok: boolean }>(`/api/v1/sessions/${sessionId}/lease`, { method: "DELETE" }),
  leaseStatus: (sessionId: string) =>
    request<{ data: { isLocked: boolean; holder?: string } }>(
      `/api/v1/sessions/${sessionId}/lease`
    ),
};

// -------------------------------------------------------------
// 7. AI Providers & Model Registry
// -------------------------------------------------------------
export const providersApi = {
  providers: () =>
    request<{ data: { providers: Array<{ id: string; name: string }> } | Array<{ id: string; name: string }> }>(
      "/api/v1/providers"
    ).then((res) => {
      const providers = (res as any)?.data?.providers || (Array.isArray(res?.data) ? res.data : []);
      return { data: providers };
    }),
  connections: () =>
    request<{ data: { connections: Array<{ id: string; kind: string; name: string; baseUrl?: string; isActive: boolean; hasApiKey: boolean }> } | Array<any> }>(
      "/api/v1/provider-connections"
    ).then((res) => {
      const connections = (res as any)?.data?.connections || (Array.isArray(res?.data) ? res.data : []);
      return { data: connections };
    }),
  saveConnection: async (body: { kind?: string; providerId?: string; name: string; apiKey?: string; baseUrl?: string; isActive?: boolean }) => {
    const payload = {
      kind: body.kind || body.providerId || "openai_compatible",
      name: body.name,
      apiKey: body.apiKey,
      baseUrl: body.baseUrl,
      isActive: body.isActive !== false,
    };
    if (typeof (window as any)?.sirona?.saveConnection === "function") {
      const connection = await (window as any).sirona.saveConnection(payload);
      return { data: { connection } };
    }
    return request<{ data: { connection: any } }>(
      "/api/v1/provider-connections",
      { method: "POST", body: payload }
    );
  },
  updateConnection: (id: string, body: { name?: string; apiKey?: string; active?: boolean }) =>
    request<{ data: { id: string; name: string } }>(`/api/v1/provider-connections/${id}`, {
      method: "PATCH",
      body,
    }),
  removeConnection: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/provider-connections/${id}`, { method: "DELETE" }),
  testConnection: (id: string) =>
    request<{ data: { success: boolean; latencyMs?: number; message?: string } }>(
      `/api/v1/provider-connections/${id}/test`,
      { method: "POST" }
    ),
  refreshModels: (id: string) =>
    request<{ data: Array<{ id: string; name: string; contextWindow?: number }> }>(
      `/api/v1/provider-connections/${id}/models/refresh`,
      { method: "POST" }
    ),
  settings: () =>
    request<{ data: { defaultModel?: string; primaryModel?: string; temperature?: number; reasoningEffort?: string } }>(
      "/api/v1/model-settings"
    ),
  saveSettings: (body: { defaultModel?: string; primaryModel?: string; temperature?: number; reasoningEffort?: string }) =>
    request<{ ok: boolean }>("/api/v1/model-settings", { method: "PATCH", body }),
  models: () =>
    request<{ data: { models: Array<{ id: string; name: string; provider: string; hasConfiguredApiKey: boolean; isDefault?: boolean; contextWindow?: number }>; connections: any[] } }>(
      "/api/v1/models"
    ),
  verifyModel: (body: { modelId: string }) =>
    request<{ data: { supported: boolean; capabilities: string[] } }>("/api/v1/models/verify", {
      method: "POST",
      body,
    }),
};

// -------------------------------------------------------------
// 8. Tools & Developer Connections
// -------------------------------------------------------------
export const toolsApi = {
  tools: () =>
    request<{ data: { items?: Array<{ id: string; name: string; description: string; requiresApproval: boolean }>; total?: number } | Array<any> }>(
      "/api/v1/tools"
    ).then((res) => {
      const items = (res as any)?.data?.items || (Array.isArray(res?.data) ? res.data : []);
      return { data: items };
    }),
  tool: (id: string) =>
    request<{ data: { id: string; name: string; schema: any } }>(`/api/v1/tools/${id}`),
  invokeTool: (body: { toolId: string; arguments: any; projectId?: string }) =>
    request<{ data: { result: any; receiptId: string } }>("/api/v1/tools/invoke", {
      method: "POST",
      body,
    }),
  receipt: (receiptId: string) =>
    request<{ data: { id: string; toolId: string; timestamp: number; outputHash: string } }>(
      `/api/v1/tools/receipts/${receiptId}`
    ),
  connections: () =>
    request<{ data: Array<{ id: string; name: string; type: string; status: string }> }>(
      "/api/v1/developer-connections"
    ),
  createConnection: (body: { name: string; type: string; config?: any }) =>
    request<{ data: { id: string; name: string } }>("/api/v1/developer-connections", {
      method: "POST",
      body,
    }),
  connection: (id: string) =>
    request<{ data: { id: string; name: string; status: string; config: any } }>(
      `/api/v1/developer-connections/${id}`
    ),
  qualifyConnection: (id: string) =>
    request<{ data: { qualified: boolean; message?: string } }>(
      `/api/v1/developer-connections/${id}/qualify`,
      { method: "POST" }
    ),
  disconnectConnection: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/developer-connections/${id}/disconnect`, { method: "POST" }),
  deleteConnection: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/developer-connections/${id}`, { method: "DELETE" }),
};

// -------------------------------------------------------------
// 9. Memory & Knowledge Graph
// -------------------------------------------------------------
export const memoryApi = {
  createMemory: (projectId: string, body: { content: string; tags?: string[] }) =>
    request<{ data: { id: string; content: string } }>(`/api/v1/projects/${projectId}/memories`, {
      method: "POST",
      body,
    }),
  memories: (projectId: string) =>
    request<{ data: Array<{ id: string; content: string; createdAt: number }> }>(
      `/api/v1/projects/${projectId}/memories`
    ),
  memory: (id: string) =>
    request<{ data: { id: string; content: string; revisions: any[] } }>(`/api/v1/memories/${id}`),
  reviseMemory: (id: string, body: { content: string }) =>
    request<{ data: { id: string; content: string } }>(`/api/v1/memories/${id}/revisions`, {
      method: "POST",
      body,
    }),
  deleteMemory: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/memories/${id}`, { method: "DELETE" }),
  searchMemories: (projectId: string, body: { query: string; limit?: number }) =>
    request<{ data: Array<{ id: string; content: string; score: number }> }>(
      `/api/v1/projects/${projectId}/memory-search`,
      { method: "POST", body }
    ),
  indexKnowledge: (projectId: string) =>
    request<{ data: { indexedNodes: number; indexedEdges: number } }>(
      `/api/v1/projects/${projectId}/knowledge-index`,
      { method: "POST" }
    ),
  knowledgeNodes: (projectId: string) =>
    request<{ data: Array<{ id: string; label: string; type: string }> }>(
      `/api/v1/projects/${projectId}/knowledge/nodes`
    ),
  knowledgeEdges: (projectId: string) =>
    request<{ data: Array<{ from: string; to: string; relationship: string }> }>(
      `/api/v1/projects/${projectId}/knowledge/edges`
    ),
};

// -------------------------------------------------------------
// 10. Verification & Evaluation
// -------------------------------------------------------------
export const verificationApi = {
  createJob: (runId: string, body: { suite?: string } = {}) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/runs/${runId}/verifications`, {
      method: "POST",
      body,
    }),
  verifications: (runId: string) =>
    request<{ data: Array<{ id: string; status: string; score?: number }> }>(
      `/api/v1/runs/${runId}/verifications`
    ),
  report: (id: string) =>
    request<{ data: { id: string; passed: boolean; results: any[] } }>(`/api/v1/verifications/${id}`),
  runEvaluation: (body: { benchmarkId: string; modelId?: string }) =>
    request<{ data: { evaluationId: string; status: string } }>(
      "/api/v1/verifications/evaluations",
      { method: "POST", body }
    ),
};

// -------------------------------------------------------------
// 11. Automation, Schedules & Triggers
// -------------------------------------------------------------
export const automationApi = {
  createSchedule: (projectId: string, body: { cron: string; action: string }) =>
    request<{ data: { id: string; cron: string } }>(`/api/v1/projects/${projectId}/schedules`, {
      method: "POST",
      body,
    }),
  schedules: (projectId: string) =>
    request<{ data: Array<{ id: string; cron: string; status: string }> }>(
      `/api/v1/projects/${projectId}/schedules`
    ),
  previewSchedule: (projectId: string, body: { cron: string }) =>
    request<{ data: { nextOccurrences: string[] } }>(
      `/api/v1/projects/${projectId}/schedules/preview`,
      { method: "POST", body }
    ),
  updateSchedule: (id: string, body: { cron?: string; active?: boolean }) =>
    request<{ data: { id: string; cron: string } }>(`/api/v1/schedules/${id}`, {
      method: "PATCH",
      body,
    }),
  pauseSchedule: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/schedules/${id}/pause`, { method: "POST" }),
  resumeSchedule: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/schedules/${id}/resume`, { method: "POST" }),
  occurrences: (id: string) =>
    request<{ data: Array<{ id: string; executedAt: number; status: string }> }>(
      `/api/v1/schedules/${id}/occurrences`
    ),
  createTrigger: (projectId: string, body: { eventType: string; filter?: any }) =>
    request<{ data: { id: string; eventType: string } }>(`/api/v1/projects/${projectId}/triggers`, {
      method: "POST",
      body,
    }),
  triggers: (projectId: string) =>
    request<{ data: Array<{ id: string; eventType: string; status: string }> }>(
      `/api/v1/projects/${projectId}/triggers`
    ),
  updateTrigger: (id: string, body: { active?: boolean; filter?: any }) =>
    request<{ data: { id: string } }>(`/api/v1/triggers/${id}`, { method: "PATCH", body }),
  projectEvents: (projectId: string) =>
    request<{ data: Array<{ id: string; type: string; timestamp: number; payload: any }> }>(
      `/api/v1/projects/${projectId}/events`
    ),
  activity: () =>
    request<{ data: Array<{ id: string; title: string; timestamp: number }> }>("/api/v1/activity"),
  notifications: () =>
    request<{ data: Array<{ id: string; message: string; read: boolean; createdAt: number }> }>(
      "/api/v1/notifications"
    ),
  readNotification: (id: string) =>
    request<{ ok: boolean }>(`/api/v1/notifications/${id}/read`, { method: "POST" }),
};

// -------------------------------------------------------------
// 12. Deployment & Browser QA
// -------------------------------------------------------------
export const deploymentApi = {
  preview: (runId: string) =>
    request<{ data: { previewUrl?: string; diff: any } }>(
      `/api/v1/runs/${runId}/deployment-previews`,
      { method: "POST" }
    ),
  create: (runId: string, body: { environment?: string } = {}) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/runs/${runId}/deployments`, {
      method: "POST",
      body,
    }),
  get: (deploymentId: string) =>
    request<{ data: { id: string; status: string; url?: string } }>(
      `/api/v1/deployments/${deploymentId}`
    ),
  rollbackPreview: (deploymentId: string) =>
    request<{ data: { diff: any } }>(`/api/v1/deployments/${deploymentId}/rollback-previews`, {
      method: "POST",
    }),
  rollback: (deploymentId: string) =>
    request<{ ok: boolean }>(`/api/v1/deployments/${deploymentId}/rollback`, { method: "POST" }),
  createQaSession: (runId: string, body: { url?: string } = {}) =>
    request<{ data: { id: string; status: string } }>(`/api/v1/runs/${runId}/browser-qa-sessions`, {
      method: "POST",
      body,
    }),
  qaSessions: (runId: string) =>
    request<{ data: Array<{ id: string; passed: boolean; recordingUrl?: string }> }>(
      `/api/v1/runs/${runId}/browser-qa-sessions`
    ),
};

// -------------------------------------------------------------
// 13. System Recovery & Diagnostics
// -------------------------------------------------------------
export const recoveryApi = {
  release: () =>
    request<{ data: { version: string; commit: string; channel: string } }>("/api/v1/system/release"),
  createCheckpoint: (body: { label?: string } = {}) =>
    request<{ data: { id: string; hash: string } }>("/api/v1/system/recovery/checkpoints", {
      method: "POST",
      body,
    }),
  checkpoints: () =>
    request<{ data: Array<{ id: string; label?: string; createdAt: number }> }>(
      "/api/v1/system/recovery/checkpoints"
    ),
  checkpoint: (id: string) =>
    request<{ data: { id: string; label?: string; manifest: any } }>(
      `/api/v1/system/recovery/checkpoints/${id}`
    ),
  rehearseCheckpoint: (id: string) =>
    request<{ data: { rehearsalId: string; status: string } }>(
      `/api/v1/system/recovery/checkpoints/${id}/rehearsal`,
      { method: "POST" }
    ),
  rehearsal: (rehearsalId: string) =>
    request<{ data: { id: string; passed: boolean; logs: string[] } }>(
      `/api/v1/system/recovery/rehearsals/${rehearsalId}`
    ),
  purge: (body: { olderThanDays?: number } = {}) =>
    request<{ ok: boolean }>("/api/v1/system/maintenance/purge", { method: "POST", body }),
  diagnostics: () =>
    request<{ data: { db: boolean; memoryMb: number; uptime: number; pid: number } }>(
      "/api/v1/system/diagnostics"
    ),
};

// -------------------------------------------------------------
// 14. Host Isolation Diagnostics
// -------------------------------------------------------------
export const isolationApi = {
  diagnostics: () =>
    request<{ data: { hypervisor: string; wslRunning: boolean; dockerRunning: boolean } }>(
      "/api/v1/isolation/diagnostics"
    ),
  qualify: () =>
    request<{ data: { qualified: boolean; details?: string } }>("/api/v1/isolation/qualify", {
      method: "POST",
    }),
  validatePath: (body: { path: string }) =>
    request<{ data: { safe: boolean; normalizedPath: string } }>(
      "/api/v1/isolation/validate-path",
      { method: "POST", body }
    ),
  qualifications: () =>
    request<{ data: Array<{ id: string; passed: boolean; timestamp: number }> }>(
      "/api/v1/isolation/qualifications"
    ),
  qualification: (id: string) =>
    request<{ data: { id: string; passed: boolean; report: any } }>(
      `/api/v1/isolation/qualifications/${id}`
    ),
};

// -------------------------------------------------------------
// 15. System Health
// -------------------------------------------------------------
export const healthApi = {
  live: () =>
    request<{ status: string; service: string; db: boolean }>("/health"),
  ready: () =>
    request<{ ready: boolean }>("/health/ready"),
  metrics: () =>
    request<string>("/health/metrics"),
};

// -------------------------------------------------------------
// Unified Sirona API Singleton
// -------------------------------------------------------------
export const sironaApi = {
  identity: identityApi,
  conversations: conversationsApi,
  projects: projectsApi,
  workspace: workspaceApi,
  execution: executionApi,
  governance: governanceApi,
  providers: providersApi,
  tools: toolsApi,
  memory: memoryApi,
  verification: verificationApi,
  automation: automationApi,
  deployment: deploymentApi,
  recovery: recoveryApi,
  isolation: isolationApi,
  health: healthApi,
};

export default sironaApi;
