---
title: "OpenAI Provider Integration"
summary: "Technical integration guide for OpenAI models (GPT-4o, o1, o3) via the official OpenAI Node.js SDK."
read_when:
  - "When configuring or debugging OpenAI models or OpenAI-compatible gateways"
  - "When updating OpenAI tool schemas or handling reasoning models"
owning_subsystem: "Model Gateway"
primary_source_files:
  - "apps/server/services/aiService.js"
  - "apps/server/services/providerService.js"
---

# OpenAI Provider Integration

Sirona integrates with OpenAI using the official `openai` Node.js SDK.

---

## 1. Authentication & Credentials

Credentials for OpenAI are resolved in this priority order:
1. **OS Credential Vault**: `provider_connections` row with `kind = 'openai'` (decrypted via `CredentialResolver`).
2. **Database Settings**: `desktop_settings.openai_api_key`.
3. **Host Environment**: `process.env.OPENAI_API_KEY`.

---

## 2. Model Discovery & Registered Defaults

The following models are registered in `apps/server/services/providerService.js`:
- `gpt-4o`: Multimodal flagship model.
- `gpt-4o-mini`: Fast, lightweight coding model.
- `o1` / `o3-mini`: Dedicated reasoning models.

---

## 3. Tool Calling Format

OpenAI expects tools wrapped under `{ type: "function", function: { name, description, parameters } }`.

`AIService.formatToolsForOpenAI(tools)` converts standard tool arrays into standard OpenAI tool objects:
```js
{
  type: "function",
  function: {
    name: "write_file",
    description: "Write content to a file",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"]
    }
  }
}
```

---

## 4. Verification Command

Run provider verification:
```bash
node scripts/run-test.js --pkg server --filter provider
```
