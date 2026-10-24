# Roadmap: Sirona Autonomous Developer Agent

## Milestones

- ✅ **v1.0 Core Agent & Desktop Studio Foundation** - Phases 1-16 (shipped 2026-10-24)
- 🚧 **v1.1 Hardening, Gateway & Sandbox Parity** - Phases 17-21 (in progress)

## Phases

- [ ] **Phase 17: Autonomous Turn Recovery & Circuit Breakers** - Ensure zero lost work on restart and add circuit breakers.
- [ ] **Phase 18: Gateway Multiplexing & Connection Pooling** - Multi-client connection pooling and channel pub/sub.
- [ ] **Phase 19: Physical CardStack Layout & Docking Parity** - Hermes-style drag-and-dock card panels.
- [ ] **Phase 20: CVE Sandbox Isolation & Subprocess Containment** - OS-level container/job object isolation.
- [ ] **Phase 21: Remote Bot Desktop & noVNC Stream Embedding** - Live browser stream via embedded noVNC.

## Phase Details

### Phase 17: Autonomous Turn Recovery & Circuit Breakers
**Goal**: Ensure zero lost work when the agent daemon restarts mid-turn and gracefully handle upstream AI provider outages or rate limits.
**Depends on**: Phase 16
**Requirements**: REQ-12
**Success Criteria** (what must be TRUE):
  1. Daemon boot check identifies pending or interrupted turns and resumes execution automatically.
  2. Monotonic lease generation prevents zombie worker processes from corrupting recovered turns.
  3. Upstream HTTP 429/503 errors trigger circuit breaker backoff with visual status indicator in the UI.
**Plans**: 2 plans

Plans:
- [ ] 17-01: Implement `AutonomousTurnRecoveryManager` and boot-time pending turn reconciliation.
- [ ] 17-02: Implement `CircuitBreakerPolicy` with adaptive backoff and UI connection status integration.

### Phase 18: Gateway Multiplexing & Connection Pooling
**Goal**: Allow multiple desktop windows or CLI sessions to interact with the Sirona daemon concurrently without state desynchronization.
**Depends on**: Phase 17
**Requirements**: REQ-13
**Success Criteria** (what must be TRUE):
  1. Multiple WebSocket clients receive synchronized session state updates without duplicate processing.
  2. Channel-based subscription model reduces unnecessary network serialization.
**Plans**: 2 plans

Plans:
- [ ] 18-01: Multi-client connection pool and pub/sub broadcast dispatcher.
- [ ] 18-02: Frontend multi-window state synchronization.

### Phase 19: Physical CardStack Layout & Docking Parity
**Goal**: Replicate the physical draggable card layout and docking panel experience of Hermes Desktop.
**Depends on**: Phase 18
**Requirements**: REQ-14
**Success Criteria** (what must be TRUE):
  1. Panels can be dragged, docked, stacked, or floated with smooth spring animations.
  2. Docking state persists across application restarts in local settings.
**Plans**: 2 plans

Plans:
- [ ] 19-01: CardStack physics engine and drag-and-dock container primitives.
- [ ] 19-02: Docking state persistence and preset layouts (Studio, Minimal, Debug).

### Phase 20: CVE Sandbox Isolation & Subprocess Containment
**Goal**: Provide strict execution isolation for shell commands and script evaluation.
**Depends on**: Phase 17
**Requirements**: REQ-15
**Success Criteria** (what must be TRUE):
  1. Commands execute inside constrained process containers or restricted Win32 Job Objects.
  2. Filesystem writes outside the active workspace are blocked at the kernel/OS boundary.
**Plans**: 2 plans

Plans:
- [ ] 20-01: OS-level sandbox runner abstraction (Windows Job Objects & Linux Bubblewrap).
- [ ] 20-02: Workspace boundary enforcement and violation reporting.

### Phase 21: Remote Bot Desktop & noVNC Stream Embedding
**Goal**: Allow developers to visually watch autonomous browser agents navigate and interact in real time.
**Depends on**: Phase 18
**Requirements**: REQ-16
**Success Criteria** (what must be TRUE):
  1. UI embeds a live noVNC RFB canvas with interactive mouse/keyboard control.
  2. Automatic display scaling and responsive viewport resizing.
**Plans**: 2 plans

Plans:
- [ ] 21-01: RFB WebSocket proxy server and headless browser virtual display container.
- [ ] 21-02: React noVNC viewer component with interactive viewport controls.

<details>
<summary>Completed Milestone 1 (Phases 1-16)</summary>

- Phase 1: Project Scaffolding & Core Architecture (Completed)
- Phase 2: FastAPI Async Daemon & REST Server (Completed)
- Phase 3: Electron Desktop Shell & Context Bridge (Completed)
- Phase 4: React 19 Frontend Studio Layout (Completed)
- Phase 5: WebSocket JSON-RPC Gateway (Completed)
- Phase 6: Multi-Provider LLM Integration (Completed)
- Phase 7: Tool Execution Registry & Filesystem Operations (Completed)
- Phase 8: Terminal Subprocess Engine (Completed)
- Phase 9: Tool Approvals & Safety Gates (Completed)
- Phase 10: SQLite Persistence & WAL Mode (Completed)
- Phase 11: Real-time Token & Reasoning Streaming (Completed)
- Phase 12: Context & Workspace Inspector (Completed)
- Phase 13: Settings & Provider Configuration (Completed)
- Phase 14: Telemetry, Latency Diagnostics & Errors (Completed)
- Phase 15: Windows Packaging & Release Build (Completed)
- Phase 16: Concurrency Control, Turn Leasing & FTS5 Search (Completed)

</details>

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1-16 (Milestone 1) | 16/16 | Complete | 2026-10-24 |
| 17. Autonomous Turn Recovery | 0/2 | Ready to plan | - |
| 18. Gateway Multiplexing | 0/2 | Planned | - |
| 19. Physical CardStack Layout | 0/2 | Planned | - |
| 20. CVE Sandbox Isolation | 0/2 | Planned | - |
| 21. Remote Bot Desktop | 0/2 | Planned | - |
