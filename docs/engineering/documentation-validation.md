---
title: "Edition 1 documentation validation and scope"
status: "PROPOSED DESIGN"
implementation: "NOT IMPLEMENTED HERE"
verification: "NOT RUN"
updated: "2026-11-05"
---

# Edition 1 documentation validation and scope

The frontmatter refers to the proposed application, whose runtime tests remain NOT RUN. Documentation and in-memory SQL checks below are separate evidence.

## Specification delivered

All F01–F24 owner contracts now contain selected operation proposals, record/input/output definitions, defaults/limits, state and failure behavior, cross-domain responsibilities and concrete acceptance cases. Each has an ordered implementation handoff, proposed source/test allocation, consumer integration and verification guide. The shared contract foundation, storage schema and build handoff are linked from the system and feature indexes. The worked journey provides request JSON and a recovery trace.

The earlier depth audit is preserved as a historical baseline. It no longer describes the current contract contents. Specifications are labeled Edition 1 proposals; they are not claims of implemented APIs, installed dependencies or approved external effects.

## Checks performed on 2026-11-05

- Feature/contract/verification scan: 24 domains, 173 distinct operation responsibility IDs and 131 concrete acceptance case IDs.
- JSON examples: both worked request bodies parse successfully.
- Relative Markdown links: 1,497 targets and 24 heading fragments resolved with exact path capitalization across 253 repository Markdown files. Feature metadata and acceptance-case handoffs matched all 24 domains; no scan errors remained.
- Proposed schema DDL executed successfully in an in-memory SQLite 3.53.3 instance: ten declared tables. Invalid foreign-key, revision and JSON rows were rejected.
- Git whitespace validation: git diff --check.
- Semantic review corrected model-route binding, native credential binding, observation persistence, pending approval continuation, direct user effect ownership, lost-response lookup and bounded standing automation authority.

These checks validate document structure, example syntax and selected database constraints. They do not execute the application, implement domain codecs, qualify a provider/guest/browser, establish complete behavioral correctness or prove every possible edge case. No persistent database, application source, dependency installation or live external effect was created.

## Deliberate scope and remaining execution inputs

Edition 1 specifies fresh-install behavior. It does not infer a legacy migration from an absent source checkout. Exact migration checksums come from the eventual implementation artifact.

The initial provider port selects an OpenAI-compatible adapter; other native providers require their own mapping. LSP and general native computer control explicitly report unavailable until separately specified and qualified. External workers and deployment have defined Sirona ports, failure/recovery/consumer behavior and qualification tests, but vendor-specific wire mappings depend on the explicitly selected adapter/target.

Real model ID/pricing/cost authorization, guest image digest and Windows qualification, browser build, worker target, deployment target, signing identity and actual runtime evidence remain execution inputs. Their absence has a specified unavailable/blocked result; implementers may not choose a paid service, bypass a gate or fabricate a success.

## Review and implementation boundary

Use the current owner contract and direct dependencies to review a bounded slice, then follow its implementation guide and the existing roadmap. Passing these documentation checks does not automatically mark all domains ready for unrestricted implementation. Any contradiction found while implementing is resolved at the owning contract and its consumers/tests together. Feature completion requires real acceptance evidence for the exact source and configuration.
