# P6 Gate B — exact local tools runtime proposal

2026-10-30. **PROPOSED; NOT APPROVED.** Gate A is already approved. This document requests only the remaining tools-image/admission/qualification gate required by `SIRONA-WORKSPACE-P6-APPROVAL.md`. Starting Docker Desktop does not approve this gate. No candidate image has been built or selected.

## Existing verified boundary

Docker Desktop Linux 29.4.3 is available. The current qualified P3 image remains `sha256:7c9a2b1782ecac683ad7cad209114702d5440f10005d5da74ef6060e739cdd39`. Do not replace its default, rewrite existing run bindings, or upgrade its threat-model claim. Windows Home remains trusted-local Docker + WSL2, not hostile-code/Hyper-V isolation.

Gate A source/context/HTTP/SDK checks pass. Actual guest Git/ripgrep/MCP/LSP, SQL grammar and lifecycle qualification are still required. P5 real-provider acceptance remains UNVERIFIED; no API charges are allowed.

## Exact review artifacts

The complete SHA-256 list is `integration/evidence/workspace-p6/gate-b-review-inputs.json`.

| File | SHA-256 |
| --- | --- |
| `tooling/sirona/docker/tools-worker.Dockerfile` | `3d126a0b8cecae7ba295f973a000758f6cef372e210d431a0913acc381782a50` |
| `tooling/sirona/docker/prepare-tools-context.mjs` | `f5fef38f2b55859b470ff7b300b3574d24968fd86a535f27be006c6cdbf438b3` |
| `tooling/sirona/docker/tools-runtime/artifacts.json` | `f0051e08975d927b7ce01cb67333c71ced9d50259b6395a97285dbb344b73b94` |
| `tooling/sirona/docker/tools-runtime/apk-lock.json` | `86145f1205e1533c04b9be3041c160aff9628b2507b413118d65268cabb3d502` |
| `tooling/sirona/docker/tools-runtime/package.json` | `2b919b691b29b58a07df1b9bfdce3c14d4116ec48b2feddea0ba3f7e4da1c56e` |
| `tooling/sirona/docker/tools-runtime/package-lock.json` | `df8bd2c87dde620a312534bf41d6501e2731473c0a1197dc289606c418e72d55` |
| `tooling/sirona/docker/tools-runtime/server.mjs` | `0ed7b82e0ccaf1bea5c575775d9d80df619da8a4c879f9d095e810f8d1ea4bf5` |

The candidate uses the same official Node foundation digest as P3: `node@sha256:2a49bdf71e9fd965a58c1703fd9ddd205b34e5782b692a72dd1d248abb0beb43`. A separate build-only WASI compiler image is pinned to `ghcr.io/webassembly/wasi-sdk@sha256:9515a0625f6ac6002aa2c285fd718cba0575b507bfaa3687ba41fea822a2bfa5` (linux/amd64). The compiler layers total approximately 771 MB compressed; they do not enter the final worker image. No host compiler install or privilege elevation is proposed.

Pinned runtime tools: Git **2.54.0-r0**, ripgrep **15.1.0-r0**, MCP SDK **1.32.2**, TypeScript language server **6.0.2**, TypeScript **6.0.3**. The APK lock includes the complete 18-package closure, exact versions, public URLs, licenses, index checksums and downloaded SHA-256 hashes. Normal APK signature verification remains enabled. The npm lock pins public package integrity hashes; scripts remain disabled.

SQL: official DerekStride SQL **0.3.11** source release SHA-256 `a97a324eae9c81ed68f6e162b9b33f8911fc6442caa2950e57c498e2460d1387`, compiled using official Tree-sitter CLI **0.26.7**, release gzip SHA-256 `4367a46bc8abbb8328d6efbeb26e86807af0a3a7e462548a3924f87289ee1e9c`. The release contains no prebuilt WASM. The current backend correctly refuses SQL until the built artifact is hash-pinned and tested. Build/toolchain compatibility is UNVERIFIED until the approved build runs; a material input/version substitution requires review, not silent fallback.

## Requested protected implementation scope

1. Build this candidate locally, inspect its resulting immutable image ID, and qualify it **only in the isolated test database**. Record exact build inputs/output hashes and compiler/runtime versions. Extract only the verified SQL WASM artifact for the already approved bounded parser; no host execution of downloaded binaries.
2. Extend `backend/src/windows/dockerRuntime.ts` image admission/owned bindings and `backend/src/workspace/homeProfile.ts` qualification to admit this additional exact tools image after actual qualification. Preserve the old P3 image/default and existing bindings. Require a distinct qualification bound to image and current source digests; fail closed on unknown image, changed profile or missing proof. Existing global worker/resource/concurrency protection applies across both image types.
3. Finish Gate A's existing `dockerWorkerAdapter.ts`, tool/context adapters and `toolRuntimeService.js` integration using that admitted image, canonical effects, existing leases and exact tool revisions. No new public route, DTO bypass, provider framework, host-spawning MCP/LSP transport or new database authority.
4. Add a bounded Git metadata export to `backend/src/workspace/workspaceBroker.ts` for the exact approved repository scope. Reject unsafe pointers/alternates, symlinks, credentials/config/hooks and unapproved paths; never mount or blanket-copy `.git`. If an input cannot be safely represented, return an explicit unavailable/denied result. Do not claim broad Git compatibility from a limited fixture.
5. Extend the existing P6 tests/runner with actual guest search, JS/TS/SQL indexing, Git status/log/diff, LSP symbols/diagnostics and MCP read-source calls through authenticated canonical HTTP and persisted receipts/context. Test revoked grants, policy/schema/source drift, expiry, cancellation, real owning-process kills and reconciliation. No blind resend of an uncertain call.

The isolated fixtures may register new tool/profile/qualification rows in `sirona_workspace_p0_test_20261028`, using existing tables only. They may not seed or modify working `sirona`. Schema remains 023 in the test database, 021 in working data. An unexpected required migration stops for a separate exact migration gate.

## Proposed commands after approval

From the repository root:

```powershell
node tooling/sirona/docker/prepare-tools-context.mjs --download
docker --host npipe:////./pipe/dockerDesktopLinuxEngine build --platform linux/amd64 --tag sirona-p6-tools:review-20261030 --file .tmp/workspace-p6-20261030/tools-build/Dockerfile .tmp/workspace-p6-20261030/tools-build
docker --host npipe:////./pipe/dockerDesktopLinuxEngine image inspect sirona-p6-tools:review-20261030
npm --prefix backend run test:p6:free
npm --prefix backend run test:p5:free
```

The preparation script verifies all locked inputs before creating a new context; refuses overwrites, archive traversal and unverified artifacts; copies only enumerated runtime/source inputs. The whole repository, user home, environment files and host credentials are never a build context. Only the npm download step has build network access; compiler/APK steps use `network=none`. Runtime egress remains disabled. No arbitrary host `docker run` qualification shortcut; tests use the existing managed owner.

The tag is only a local build handle. Qualification and invocation pin the inspected image ID, never the mutable tag. An image existing or a build succeeding is not qualification.

## Required acceptance and rollback

- Repeat non-root, read-only root filesystem, no capabilities/new privileges, seccomp, no host/control-plane/credential mounts, no egress, CPU/PID/memory/swap/disk and confirmed termination checks for the actual new image.
- All actual guest tool workflows must pass under scoped approvals/fences, with content provenance and durable receipts. Cached/restarted operations recheck current authority and reconcile unknown outcomes.
- Run the P5 regression suite and a source-bound evidence review. Publish remaining blocked criteria truthfully; no mock or controlled provider result counts as real inference.
- Before first dispatch, checkpoint any additional protected files. On failure, deny admission of the new tools image/revisions, stop only its owned workers and retain unknown-outcome receipts. Preserve old P3 bindings and the existing database/UI; no Docker prune, WSL shutdown, broad cleanup, schema rollback or automatic data deletion.

## Excluded

No working-data writes, migration, paid inference, production profile/feature activation, Windows/admin changes, privileged containers, host execution fallback, frontend change, P7/P8 work, commits, pushes or deployment. Production flags stay OFF. This approval would permit only the stated local candidate build and free isolated qualification/integration.

## Primary references

- [Tree-sitter supported WASM build](https://tree-sitter.github.io/tree-sitter/cli/build.html).
- [Official WASI SDK compiler/image](https://github.com/WebAssembly/wasi-sdk).
- [SQL grammar 0.3.11 release](https://github.com/DerekStride/tree-sitter-sql/releases/tag/v0.3.11).

## Owner decision

**Pending.** Suggested exact decision: “Approve P6 Gate B for the listed candidate build, additional image admission and free isolated qualification/integration only; preserve the stated exclusions.”
