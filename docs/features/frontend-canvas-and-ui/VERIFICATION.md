# Verification & Testing: Frontend Canvas & Workspaces

## 1. Acceptance Criteria & Test Matrix

| Test ID | Test Description | Verification Target | Pass Condition |
|---|---|---|---|
| `UI-01` | TypeScript compilation | `apps/web` build check | `tsc --noEmit` exits with 0 errors |
| `UI-02` | Vite production bundle | `pnpm --filter @sirona/web build` | Builds `dist/` bundle cleanly without warnings |
| `UI-03` | SSE token streaming | Submit message in chat | Tokens render progressively without UI freezes |
| `UI-04` | Approval banner interaction | Trigger dangerous command | Approval banner appears; clicking "Approve" triggers backend API |
| `UI-05` | Model selector selection | Open modal, pick model | Active model updates in header and persists across turns |

---

## 2. Automated Test Commands

```bash
# Typecheck frontend
pnpm --filter @sirona/web check

# Run React component and hook unit tests
pnpm --filter @sirona/web test

# Test SSE streaming integration
node apps/web/tests/sse.test.mjs
```
