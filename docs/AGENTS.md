# Documentation Guidelines & Operating Instructions for Sirona

This file governs the creation, organization, linking, maintenance, and verification of documentation within Sirona's `docs/` hierarchy. All agents and human contributors working on documentation must strictly adhere to these rules.

---

## 1. Documentation Architecture & Taxonomy

Sirona's documentation is divided into distinct, non-overlapping categories inspired by upstream industry conventions:

| Category | Path | Purpose & Scope |
|---|---|---|
| **Architecture** | `docs/architecture/` | High-level system structure, data flow, package boundaries, and invariants. |
| **Concepts** | `docs/concepts/` | Conceptual models, domain entities, and lifecycles (Agent Loop, Model Routing, Session Lifecycle). |
| **Subsystems** | `docs/subsystems/` | Canonical technical deep-dives into core engines (Gateway, Runtime, Tools, Persistence). |
| **Model Gateway** | `docs/model-gateway/` | Gateway-specific guides (routing, streaming, auth, troubleshooting). |
| **Providers** | `docs/providers/` | Concrete vendor integrations (Google Gemini, OpenAI, Anthropic, OpenAI-compatible). |
| **Tools** | `docs/tools/` | Tool implementations (filesystem, shell, git, MCP, approvals). |
| **Engineering** | `docs/engineering/` | Developer guides, testing protocols, coding conventions, and verification methods. |
| **Reference** | `docs/reference/` | API specifications, configuration schemas, contracts, and error dictionaries. |

---

## 2. Frontmatter & Metadata Standards

Every canonical document in `docs/` must begin with YAML frontmatter containing:

```yaml
---
title: "Document Title"
summary: "Single-sentence concise summary of the document's content and purpose."
read_when:
  - "Condition 1 (e.g. When implementing or debugging a model provider adapter)"
  - "Condition 2 (e.g. When configuring API credentials for LLM inference)"
owning_subsystem: "Model Gateway"
primary_source_files:
  - "apps/server/services/providerService.js"
  - "apps/server/services/aiService.js"
---
```

---

## 3. Core Rules for Documentation Writing

### Rule 1: No Imagined Architecture
Never document hypothetical, speculative, or unverified implementations as completed. If a feature is planned or in-progress (e.g., Vercel AI SDK integration or LangGraph dynamic checkpointing), explicitly label its status as `Planned / Under Development`.

### Rule 2: Canonical Source Files Over Output Directories
Always reference the primary, editable source files (e.g., `apps/server/src/` or `apps/server/services/`). Never point to `dist/`, `dist-workspace/`, `build/`, or bundled artifacts as owning source files.

### Rule 3: Single Source of Truth
Avoid duplication across documents. If a topic is thoroughly covered in `docs/subsystems/model-gateway.md`, related provider documents (`docs/providers/gemini.md`) must link to it rather than re-explaining general gateway mechanics.

### Rule 4: Linking Conventions
- Always use relative markdown links with forward slashes (e.g., `[Model Gateway](subsystems/model-gateway.md)`).
- When linking to source code, use repository-relative paths formatted in backticks (e.g., `apps/server/services/aiService.js`) or standard markdown links.

---

## 4. Documentation Lifecycle: When to Update vs. Create

Agents must choose the smallest, least disruptive documentation action:

1. **Update an Existing Subsection**: If modifying an existing function, endpoint, parameter, or bugfix in a subsystem, update the specific subsection in the existing guide.
2. **Add a Section to an Existing Page**: If adding a new capability to an existing subsystem (e.g., a new tool in `tool-execution.md`), append a section to that guide.
3. **Create a New Page**: Only create a new page when adding a distinct new provider (e.g., `docs/providers/groq.md`), a new standalone tool adapter, or a new subsystem architecture document.
4. **Register in `docs/INDEX.md`**: Whenever a new document is created, add its entry to `docs/INDEX.md` and ensure `node scripts/docs.js --validate` passes.

---

## 5. Automated Validation & Discovery

All documentation files can be indexed and validated using the documentation CLI:

```bash
# Search documentation for keywords
node scripts/docs.js search "model gateway"

# Validate that all documentation links and source references exist
node scripts/docs.js validate
```
