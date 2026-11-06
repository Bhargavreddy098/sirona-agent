---
title: "Google Gemini Provider Integration"
summary: "Technical integration guide for Google Gemini models via the official Google GenAI ADK."
read_when:
  - "When configuring or debugging Google Gemini models"
  - "When adding new Gemini model variants or updating tool schemas for Google ADK"
owning_subsystem: "Model Gateway"
primary_source_files:
  - "apps/server/services/aiService.js"
  - "apps/server/services/providerService.js"
---

# Google Gemini Provider Integration

Sirona integrates directly with Google Gemini using the official `@google/genai` ADK.

---

## 1. Authentication & Credentials

Credentials for Google Gemini are resolved in the following priority order:
1. **OS Credential Vault**: `provider_connections` row with `kind = 'google'` (decrypted via `CredentialResolver` in Electron).
2. **Database Settings**: `desktop_settings.gemini_api_key`.
3. **Host Environment**: `process.env.GEMINI_API_KEY`.

If no key is configured, calls return HTTP 400 `API_KEY_REQUIRED`.

---

## 2. Model Discovery & Registered Defaults

The following models are registered in `apps/server/services/providerService.js`:
- `gemini-2.5-flash`: Fast, multi-turn reasoning and agent coding model.
- `gemini-2.5-pro`: High-capacity model for complex architecture tasks.
- `gemini-3.5-flash`: Experimental next-generation flash tier.

---

## 3. Tool Calling Schema Specifics

Google GenAI ADK requires uppercase JSON Schema types (e.g., `OBJECT`, `STRING`, `INTEGER`) and function declarations formatted under `functionDeclarations`. 

`AIService.formatToolsForGemini(tools)` automatically transforms standard OpenAPI/JSON schemas into this format:
```js
{
  functionDeclarations: [
    {
      name: "read_file",
      description: "Read file contents",
      parameters: { type: "OBJECT", properties: { path: { type: "STRING" } }, required: ["path"] }
    }
  ]
}
```

---

## 4. Streaming Execution & Candidate Preservation

During multi-turn execution, Gemini streams response parts. When the model emits function calls, Gemini often includes reasoning thoughts (`thoughtSignature` / candidate metadata). `AIService.streamTurn` preserves the raw candidate structure (`_rawCandidate`) in conversation history to ensure multi-turn context integrity.

---

## 5. Verification Command

Run provider verification:
```bash
node scripts/run-test.js --pkg server --filter provider
```
