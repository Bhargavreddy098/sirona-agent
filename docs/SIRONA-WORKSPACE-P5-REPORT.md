# Sirona P5 implementation closeout

Later scoped frontend/backend wiring is recorded in [its 2026-10-30 report](SIRONA-FRONTEND-BACKEND-WIRING-REPORT.md). Its public prepared-approval journey and 22 free P5 regressions pass. Use that report's current source hashes for the changed integration files; this historical repair report does not grant broader UI/production authority or remove the real-provider acceptance gate.

**Current P5 status (2026-10-29): implementation and free qualification delivered; full acceptance is NOT COMPLETE. The owner prohibits API charges; the real-provider workflow remains UNVERIFIED. No P6+, migrations or production activation is authorized.**


## Authority and preserved scope

The owner requested completion of the P5 repair and explicitly approved the bounded-provider extension with “Approve the scoped provider extension; free tests only.” The owner separately instructed: “Do not incur any API charges without my explicit approval.” These instructions authorize this repair and free qualification, not inference spending or rollout.

Existing Node/Express services, /api/v1 route names, working PostgreSQL data, provider discovery/native IDs, credential owners, and frontend source/design are preserved. No migration was authored or applied. Working flags remain OFF. No P6 work, commits, pushes, deployments, privileged installs, Docker prune or host execution fallback was performed.

## Delivered implementation

- Actual compiled LangGraph nodes invoke canonical activities: layered-plan consumption, parent fanout/join, independent critique, durable approval interruption, serial Docker execution, exact P3 patch approval/application, fresh independent verification and bounded repair.
- The official saver uses the existing run_checkpoints table. It preserves full SDK state, parent lineage, namespace identity, pending writes/sends, serializer types, exact BIGINT sequences and real run epochs. Explicit flush barriers handle the pinned SDK's asynchronous saves, including writes arriving before their checkpoint. Digest/version/fence failures deny continuation.
- Durable delegation uses runs/tasks/agent_sessions with transaction/advisory locks: parent only, at most three concurrent specialists across the Home profile, twelve total delegated tasks, bounded review/repair rounds and deadlines. Assignment metadata does not become tool permission.
- Model activities use the existing provider and turn-lease owners with stable effect identity, bounded context/output/deadline, exact registry IDs, usage receipts and run reservations. Unknown transport outcomes retain reserved charges and cannot trigger another inference automatically.
- Canonical workflow start/execute/pause/resume/cancel and production lifecycle own graph dispatch. An immutable checkpoint binding plus durable engine event prevents legacy fallback. Authentication is supplied fresh on resume; raw session tokens never enter checkpoint state. Cancellation with uncertain effects stays cancelling.
- Tools, patches and verification call actual existing owners. Synthetic patch success, token-substring verification, no-op graph nodes and the competing prototype execution implementation were removed. Provider changes are optional internal limits; ordinary-chat defaults remain unchanged.

Pinned direct SDK dependencies: @langchain/langgraph 0.2.1, @langchain/langgraph-checkpoint 0.0.18, @langchain/core 0.2.36. These were already installed; no second orchestration engine or retrieval stack was added. External/prompt-verbose LangChain tracing is rejected for this local workflow.

## Verification and its limits

| Check | Actual result |
| --- | --- |
| npm --prefix backend run test:p5:free | 22/22 PASS; zero failures/skips; builds strict TypeScript first |
| Canonical authenticated HTTP/SSE workflow | PASS with explicitly controlled loopback upstream, actual SQL/tasks/leases, actual Docker guest, command/patch/verifier approvals, host patch and independent report; three model transport calls across repeated resumes |
| Independent guest verifier | PASS: deliberately wrong candidate fails; approved correction passes in a different fresh guest; producer self-verification and digest swaps denied |
| Real process death | PASS: actual Node SIGKILL/restart before checkpoint acknowledgment reuses a committed DB effect; dispatched uncertainty is not repeated |
| Interrupted model transport | PASS: actual controlled HTTP interruption retains unknown charges and denies redispatch; turn lease released |
| Scoped source lint | PASS, --deny-warnings |
| Unchanged frontend typecheck | PASS |
| Selected existing legacy regressions | 200 PASS, 1 FAIL: unchanged admission inventory cannot parse the pre-existing literal-array authentication middleware. No assertion was disabled or skipped |
| Broader workspace regression | Earlier free run: 78/78 PASS. Its transcript is retained; it is not represented as a final-source real-provider run |
| Whole retained JavaScript static checker | 38 diagnostics remain. Saved-source comparison: 48 before repair, 38 after, no added diagnostic counts by file/code. This is baseline debt, not a green full-source checker |
| Real Google credential authentication | PASS through the existing models metadata endpoint, read-only; no inference |
| Real-provider P5 inference/fanout/recovery | UNVERIFIED: no-charge instruction; no real-model inference was performed |

Controlled upstream text is test input, never evidence of successful real-model inference. Free SQL-only crash fixtures do not qualify arbitrary external exactly-once execution. Full P5 acceptance and production readiness are not claimed.

Additional legacy-suite outcomes are in free-legacy-regression.txt. The broad admission inventory has a pre-existing inability to parse the existing literal-array router.use authentication middleware; the P5 repair does not weaken that security test or its admission policy. Any remaining failures are reported rather than suppressed.

## Evidence and reproducibility

Run **npm --prefix backend run test:p5:free**. This command selects only free P5 suites and pins the isolated test target. Do not use test:workspace as a no-charge substitute: it also includes live-provider tests.

Evidence: docs/integration/evidence/workspace-p5-repair/{free-verification.json,free-p5-tests.txt,build.txt,source-hashes.json,static-baseline-comparison.json,lint.txt,frontend-check.txt,database-preservation.json,credential-status.json,provider-auth-status.json}. All test mutations target sirona_workspace_p0_test_20261028, schema 023. Working sirona remains schema 021; its inspection was enforced READ ONLY.

The replaced prototype assertions tested helpers or fabricated success, not the required activities. Replacement coverage exercises actual SDK/SQL/HTTP/guest behavior plus adversarial denials. Required real-provider acceptance was retained and explicitly left UNVERIFIED.

## Rollback and remaining gate

Source rollback checkpoint: .tmp/p5-repair-20261029/manifest.json and saved files. P4 provider originals were recovered and verified byte-for-byte against accepted P4 hashes. Worker source was reconstructed by reversing only this task's additions; inspect the diff before restoration. Do not reset the checkout or restore unrelated user changes.

Stop new graph starts, quiesce owned work and reconcile uncertain effects before restoring touched files. Keep durable checkpoints/effects and their pinned engine version; never resume a graph as legacy dispatch. No schema rollback exists because no DDL was applied. Do not restore old prototype code into an active graph run.

Remaining acceptance work: an explicitly approved, bounded real-provider end-to-end test and independent review of its exact-source evidence; disposition of the retained admission-inventory failure under the existing security-test rules. Credential configuration is available; no key is requested. Until the required gates pass, P5 stays awaiting acceptance and P6 remains unauthorized. Production rollout is a separate later gate.
