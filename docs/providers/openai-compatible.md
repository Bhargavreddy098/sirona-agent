---
title: "OpenAI-Compatible & Local Provider Integration"
summary: "Guide for configuring Ollama, vLLM, LM Studio, and OpenRouter via Sirona's OpenAI-compatible adapter."
read_when:
  - "When connecting local offline models (Ollama, LM Studio) or third-party gateways (OpenRouter, Together)"
  - "When configuring custom base URLs and model refresh endpoints"
owning_subsystem: "Model Gateway"
primary_source_files:
  - "apps/server/services/aiService.js"
  - "apps/server/services/providerService.js"
---

# OpenAI-Compatible & Local Provider Integration

Sirona supports any OpenAI-compatible API endpoint (e.g. **Ollama**, **vLLM**, **LM Studio**, **OpenRouter**, **LocalAI**).

---

## 1. Authentication & Base URL Resolution

- **Base URL**:
  1. `provider_connections.base_url` for connections where `kind = 'openai_compatible'`.
  2. Database `desktop_settings.custom_base_url`.
  3. Environment: `process.env.OPENAI_COMPATIBLE_BASE_URL` or `process.env.CUSTOM_BASE_URL`.
  4. Default for Ollama if unset: `http://127.0.0.1:11434/v1`.
- **API Key**:
  - Optional for local runtimes like Ollama. If required (e.g. OpenRouter), resolved from `provider_connections.api_key_ciphertext`, `desktop_settings.custom_api_key`, or `process.env.OPENAI_COMPATIBLE_API_KEY`.

---

## 2. Dynamic Model Discovery

For OpenAI-compatible providers, Sirona provides a dynamic model discovery endpoint:

`POST /api/v1/provider-connections/:id/models/refresh`

This endpoint:
1. Pings `${baseUrl}/models` using safe SSRF-guarded fetch (`apps/server/foundation/ssrfGuard.js`).
2. Extracts model IDs from the returned JSON list.
3. Synchronizes available models in Sirona's `models` registry table.

---

## 3. SSRF Protection & Private Network Policy

All custom URLs are validated through `validateSafeEndpointUrl` in `apps/server/foundation/ssrfGuard.js`:
- Loopback addresses (`127.0.0.1`, `localhost`) are explicitly permitted to support local runtimes.
- Cloud metadata services (`169.254.169.254`) and AWS/GCP internal metadata IP ranges are blocked.
