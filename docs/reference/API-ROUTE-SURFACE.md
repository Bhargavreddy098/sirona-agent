# Sirona API Route Surface & Client Mapping

This document provides a comprehensive mapping between Sirona's canonical Express `/api/v1` backend routes and the typed frontend client [`apps/web/src/api/sironaClient.ts`](file:///apps/web/src/api/sironaClient.ts).

---

## Route Domains & Surface Summary

| Domain | Route Mount | Backend Router File | Frontend Client Object | Route Count |
|---|---|---|---|---|
| **Identity & Auth** | `/api/v1/auth`, `/api/v1/identity` | [`routes/v1/identity.routes.js`](file:///apps/server/routes/v1/identity.routes.js) | `identityApi` | 8 |
| **Conversations** | `/api/v1/conversations` | [`routes/v1/conversations.routes.js`](file:///apps/server/routes/v1/conversations.routes.js) | `conversationsApi` | 14 |
| **Projects** | `/api/v1/projects` | [`routes/v1/projects.routes.js`](file:///apps/server/routes/v1/projects.routes.js) | `projectsApi` | 10 |
| **Workspace Filesystem** | `/api/v1/workspace` | [`routes/v1/workspace.routes.js`](file:///apps/server/routes/v1/workspace.routes.js) | `workspaceApi` | 16 |
| **Execution & Turns** | `/api/v1/execution`, `/api/v1/runs` | [`routes/v1/execution.routes.js`](file:///apps/server/routes/v1/execution.routes.js) | `executionApi` | 18 |
| **Governance & Approvals**| `/api/v1/governance`, `/api/v1/approvals`| [`routes/v1/governance.routes.js`](file:///apps/server/routes/v1/governance.routes.js) | `governanceApi` | 12 |
| **Model Providers** | `/api/v1/providers`, `/api/v1/models` | [`routes/v1/providers.routes.js`](file:///apps/server/routes/v1/providers.routes.js) | `providersApi` | 15 |
| **Tools & Operations** | `/api/v1/tools` | [`routes/v1/tools.routes.js`](file:///apps/server/routes/v1/tools.routes.js) | `toolsApi` | 14 |
| **Memory & Intelligence**| `/api/v1/memory` | [`routes/v1/memory.routes.js`](file:///apps/server/routes/v1/memory.routes.js) | `memoryApi` | 9 |
| **Verification & Tests** | `/api/v1/verification` | [`routes/v1/verification.routes.js`](file:///apps/server/routes/v1/verification.routes.js) | `verificationApi` | 8 |
| **Automation** | `/api/v1/automation` | [`routes/v1/automation.routes.js`](file:///apps/server/routes/v1/automation.routes.js) | `automationApi` | 10 |
| **Deployment** | `/api/v1/deployment` | [`routes/v1/deployment.routes.js`](file:///apps/server/routes/v1/deployment.routes.js) | `deploymentApi` | 6 |
| **Recovery & Diagnostics**| `/api/v1/recovery` | [`routes/v1/recovery.routes.js`](file:///apps/server/routes/v1/recovery.routes.js) | `recoveryApi` | 6 |
| **Sandbox & Isolation** | `/api/v1/isolation` | [`routes/v1/isolation.routes.js`](file:///apps/server/routes/v1/isolation.routes.js) | `isolationApi` | 5 |
| **System Health** | `/health`, `/health/ready` | [`routes/health.routes.js`](file:///apps/server/routes/health.routes.js) | `healthApi` | 3 |

**Total Canonical Routes:** 148 verified routes.

---

## Common Middleware & Security Gates
1. **`createHttpBoundary(allowedOrigins, admission)`**: Validates origins (`http://localhost:*`, `app://sirona`) and admission tokens on all incoming HTTP requests.
2. **`auditContext`**: Injects correlation ID, IP address, and timestamp into `req.audit`.
3. **`rateLimiter`**: Enforces sliding-window rate limit (default 100 req/min per IP).
4. **`sessionAuth()`**: Validates active session cookie/bearer token before delegating to route handlers.
5. **CSRF Protection**: Mutating methods (`POST`, `PUT`, `PATCH`, `DELETE`) require header `X-CSRF-Token`.
