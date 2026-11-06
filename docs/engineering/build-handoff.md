---
title: "Edition 1 implementation handoff"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Edition 1 implementation handoff

This is a proposed source/test layout for the existing roadmap, not source that currently exists. Read the selected feature's requirements, contracts, connections, implementation and verification, plus [shared contracts](../architecture/contract-foundation.md) and [storage](../architecture/storage-contract.md). The user authorized this documentation work, not application implementation.

## Source ownership

| Proposed path | Responsibility |
|---|---|
| src/contracts/common.ts | Shared value codecs and envelopes; no business decisions |
| src/contracts/registry.ts | Literal operation name, codec, public/internal classification, handler, required capability |
| src/domains/DOMAIN/schema.ts | Domain's exact entity/input/result codecs from contracts.md |
| src/domains/DOMAIN/service.ts | Canonical operations and state transitions; DOMAIN is the existing docs directory name |
| src/domains/DOMAIN/repository.ts | Domain record queries through the sole F03 transaction port |
| src/domains/DOMAIN/adapters/ | Only the external boundary named by that domain; no parallel runtime |
| src/storage/ | Database open, serialized writer, migration 001, operation journal and blob/reference validation; F03 owner |
| src/gateway/ | HTTP RPC admission, authenticated SSE, readiness; F01 owner |
| src/desktop/main/ and src/desktop/preload/ | Native lifecycle, IPC and credential boundary; F22 with F02 policy |
| src/web/features/DOMAIN/ | Domain consumers; shared presentation behavior owned by F23 |
| src/cli/ | Grammar/output and gateway client; F24 owner |
| tests/features/Fxx/ | schema.test.ts, service.test.ts, recovery.test.ts, consumer.test.ts for the feature's actual applicable cases |
| tests/fixtures/ | Isolated roots, fake clock, deterministic IDs, failure injection and local protocol servers |
| tests/journeys/ | Cross-feature product journeys using the public/native boundary |

Do not create empty files for unavailable optional adapters. A capability registration can explicitly report unavailable with a reason. Package/runtime versions are pinned in the future lockfile after checking current supported releases and Windows/Electron native compatibility; no version is falsely claimed installed by this documentation.

## IP00 deliverable and proposed commands

The authorized bootstrap task creates one TypeScript package/workspace with package scripts below, a lockfile, strict type checking, Vitest for deterministic/contract/integration checks and Playwright/Electron for real consumer journeys. A wrapper must accept the named feature/suite and fail if it discovers zero tests. These commands are specifications for scripts to create; none can be run in the current docs-only checkout.

| Command to implement | Required semantics |
|---|---|
| pnpm typecheck | Type-check all production and test TypeScript; nonzero on any error |
| pnpm test:feature -- F03 | Run every ungated tests/features/F03 case; unknown ID or zero tests fails |
| pnpm test:journey -- local-build | Run the selected real consumer journey; missing required provider/guest config reports BLOCKED, never PASS |
| pnpm test:qualification -- guest | Run only the explicitly authorized live profile suite; no implicit fallback |
| pnpm docs:check | Validate feature IDs, operation/test references, links, schema examples and declared enums against the implemented codecs |

Each feature implementation guide supplies ordered slices. Within a slice implement codecs and failing behavior cases, storage transition/service, boundary adapter, then consumer and recovery tests. Do not add a UI button before its operation exists or declare feature acceptance from codec tests alone. Source paths are allocations, not permission to invent a second owner if source is later imported.

## Acceptance fixture and evidence format

All deterministic scenarios start with an empty isolated root, fake clock 2026-11-05T12:00:00.000Z, explicit local principal/workspace, no configured providers, guest, browser, workers or deployment targets. Tests create only the entities named by their scenario; seed IDs are valid fixed UUID v4 strings. Fixture factories must use the real codecs and repository constraints. Fake adapters are marked simulated and restricted to failure/contract checks.

For each Fxx-Tnn case record {caseId, requirementIds, sourceCommit, command, environmentDigest, dataRoot, startedAt, finishedAt, outcome:"PASS"|"FAIL"|"BLOCKED", artifactDigests, sanitizedEvidencePaths}. The application verdict UNKNOWN differs from a test execution outcome BLOCKED. Record actual process receipts for live work; mocked responses cannot qualify a model, sandbox, browser or external adapter. Domain verification pages bind scenarios to operations. At least one scenario must traverse the actual consuming interface for every visible action family.

## Cross-feature acceptance journeys

| Journey | Concrete path and required result |
|---|---|
| local-plan | F22 boots F03/F02/F01; F23 or F24 creates project/session, captures F06 requirements, creates F07 contract in Plan Only; no workspace write or tool dispatch occurs |
| local-build | Same entry with qualified F04/F05 and F12; F08 authorizes F11 effect; F09 records intent/receipt; F15 checks exact artifact; UI/CLI renders real verdict and F20 usage |
| interrupted-build | Kill after patch dispatch before receipt; restart F22/F03/F09; reconcile workspace hashes, never blindly reapply; resume observation and preserve interrupted output |
| restore | F21 backs up actual typed records/blobs; restore into isolated root; application opens it and finds the same contract/artifact/receipt relationships; credentials may need rebinding |
| scheduled-build | After IP10, F17 admits one due occurrence under existing scoped authority; F09 owns execution; local inbox failure retries delivery only |

## Changes and remaining execution decisions

Edition 1 selects semantics, API shapes, state transitions, record schemas, limits and test expectations in the owner docs. Concrete live model ID/prices/spend ceiling, guest image digest/profile evidence, external worker/browser adapter and deployment target remain explicit activation/qualification inputs. Their absence has a specified unavailable/blocked result; it is not a license for an implementer to choose a paid service or host fallback.

Do not mark the full product verified before running the required real journeys. Review a bounded contract against the [specification standard](operation-specification.md), record any discovered contradiction at its owner, and update dependent codecs/examples together. The [roadmap](roadmap.md) continues to determine build order.
