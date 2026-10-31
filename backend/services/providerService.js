import { query, transaction } from "../config/db.js";
import { Setting } from "../model/Setting.js";
import { AIService } from "./aiService.js";
import { GovernanceService } from "./governanceService.js";
import { TurnLease } from "../model/TurnLease.js";
import { validateSafeEndpointUrl, safeFetch } from "../foundation/ssrfGuard.js";
import { CredentialResolver } from "../dist-workspace/src/providers/credentialResolver.js";
import { buildProjectPrompt } from "./projectContext.js";

/* =====================================================================
   Provider Service — Stage 06 AI Engine & Model Registry
   Manages qualified models, provider credentials, streaming turns,
   and token usage cost accounting linked to Stage 05 budgets.
   ===================================================================== */

export class ProviderServiceError extends Error {
  /**
   * @param {string} code
   * @param {number} status
   * @param {string} message
   */
  constructor(code, status, message) {
    super(message);
    this.name = "ProviderServiceError";
    this.code = code;
    this.status = status;
  }
}

export class ProviderService {
  /**
   * Resolve API key for a provider from PostgreSQL settings, provider connections, or environment.
   * Fails fast if no valid key is configured (zero fake data/unauthorized mocks).
   * @param {string} providerKind
   * @returns {Promise<string|null>}
   */
  static async getApiKey(providerKind) {
    const p = providerKind.toLowerCase();

    // 1. Check provider_connections table via CredentialResolver
    const connRes = await query(
      "SELECT * FROM provider_connections WHERE kind = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1",
      [p]
    );
    if (connRes.rows[0]) {
      const resolved = CredentialResolver.resolveCredential(connRes.rows[0]);
      if (resolved.status === "requires_reauth") return null;
      if (resolved.apiKey) return resolved.apiKey;
    }

    // Plaintext settings are migration inputs, never an active credential fallback.
    // 3. Fall back to environment variables
    if (p === "google") return process.env.GEMINI_API_KEY || null;
    if (p === "openai") return process.env.OPENAI_API_KEY || null;
    if (p === "anthropic") return process.env.ANTHROPIC_API_KEY || null;
    if (p === "openai_compatible") return process.env.OPENAI_COMPATIBLE_API_KEY || process.env.CUSTOM_API_KEY || null;

    return null;
  }

  /**
   * Resolve custom base URL for OpenAI-compatible providers.
   * @param {string} providerKind
   * @returns {Promise<string|null>}
   */
  static async getBaseUrl(providerKind) {
    const p = providerKind.toLowerCase();
    if (p !== "openai_compatible") return null;

    const connRes = await query(
      "SELECT base_url FROM provider_connections WHERE kind = $1 AND is_active = true ORDER BY updated_at DESC LIMIT 1",
      [p]
    );
    if (connRes.rows[0]?.base_url) {
      return connRes.rows[0].base_url;
    }

    const settings = await Setting.getAll();
    if (settings.custom_base_url) return settings.custom_base_url;

    return process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.CUSTOM_BASE_URL || null;
  }

  /**
   * List all qualified and available models from the PostgreSQL registry.
   */
  static async getModels() {
    const googleKey = !!(await this.getApiKey("google"));
    const openaiKey = !!(await this.getApiKey("openai"));
    const anthropicKey = !!(await this.getApiKey("anthropic"));
    const customKey = !!(await this.getApiKey("openai_compatible"));

    const res = await query(
      `SELECT m.id, m.provider_kind, m.name, m.context_window, m.max_output_tokens,
              m.input_cost_micro_usd_per_m, m.output_cost_micro_usd_per_m, m.is_available, m.created_at,
              m.provider_connection_id,
              pc.name as connection_name, pc.base_url,
              (pc.api_key_ciphertext IS NOT NULL AND pc.api_key_ciphertext != '') as conn_has_key,
              pc.is_active as conn_is_active
       FROM models m
       LEFT JOIN provider_connections pc ON pc.id = m.provider_connection_id
       WHERE m.is_available = true AND (m.provider_connection_id IS NULL OR pc.is_active = true)
       ORDER BY m.name ASC`
    );

    const models = [];
    for (const row of res.rows) {
      let hasKey = false;
      if (row.provider_connection_id) {
        hasKey = !!row.conn_has_key || row.provider_kind === "openai_compatible";
      } else if (row.provider_kind === "google") {
        hasKey = googleKey;
      } else if (row.provider_kind === "openai") {
        hasKey = openaiKey;
      } else if (row.provider_kind === "anthropic") {
        hasKey = anthropicKey;
      } else {
        hasKey = customKey;
      }

      models.push({
        id: row.id,
        name: row.name,
        provider: row.provider_kind,
        connectionName: row.connection_name || null,
        providerConnectionId: row.provider_connection_id || null,
        contextWindow: row.context_window,
        maxOutputTokens: row.max_output_tokens,
        pricing: {
          inputCostPerMillionMicroUsd: row.input_cost_micro_usd_per_m,
          outputCostPerMillionMicroUsd: row.output_cost_micro_usd_per_m,
        },
        hasConfiguredApiKey: hasKey,
      });
    }

    return models;
  }

  /**
   * Fetch a single qualified model profile.
   * Supports lookup by ID, displayName, and slash-stripped variations.
   * @param {string} modelId
   */
  static async getModelById(modelId) {
    if (!modelId || typeof modelId !== "string") return null;
    const cleanId = modelId.trim();
    const withoutSlash = cleanId.replace(/\//g, "");

    const res = await query(
      `SELECT m.*, pc.base_url, pc.api_key_ciphertext, to_jsonb(pc)->>'credential_ref' as credential_ref, to_jsonb(pc)->>'credential_status' as credential_status, pc.is_active as conn_is_active
       FROM models m
       LEFT JOIN provider_connections pc ON pc.id = m.provider_connection_id
       WHERE m.id = $1 
          OR m.name = $1 
          OR m.id = $2
          OR m.name = $2
          OR REPLACE(m.id, '/', '') = $2
          OR REPLACE(m.name, '/', '') = $2
       ORDER BY (m.id = $1) DESC, (m.name = $1) DESC
       LIMIT 1`,
      [cleanId, withoutSlash]
    );

    if (res.rows[0]) {
      const row = res.rows[0];
      const resolved = CredentialResolver.resolveCredential({
        api_key_ciphertext: row.api_key_ciphertext,
        credential_ref: row.credential_ref,
        credential_status: row.credential_status,
        is_active: row.conn_is_active,
      });
      if(row.provider_connection_id && resolved.status === "requires_reauth") throw new ProviderServiceError("CREDENTIAL_REAUTH_REQUIRED",401,"Provider credentials require re-authentication");
      return {
        ...row,
        resolvedBaseUrl: row.base_url || null,
        resolvedApiKey: resolved.apiKey,
        credentialStatus: resolved.status,
      };
    }
    return null;
  }

  /**
   * List distinct active provider connections.
   */
  static async getProviderConnections({ all = true, workspaceId = null } = {}) {
    const conditions = ["is_active = true"];
    const params = [];
    if (workspaceId) {
      params.push(workspaceId);
      conditions.push(`(workspace_id IS NULL OR workspace_id = $${params.length})`);
    }
    const sql = all
      ? `SELECT *
         FROM provider_connections
         WHERE ${conditions.join(" AND ")}
         ORDER BY updated_at DESC`
      : `SELECT DISTINCT ON (kind) *
         FROM provider_connections
         WHERE ${conditions.join(" AND ")}
         ORDER BY kind, updated_at DESC`;
    const res = await query(sql, params);
    return res.rows.map((r) => CredentialResolver.sanitize(r));
  }

  /**
   * Return supported provider types with canonical presets and metadata.
   */
  static getSupportedProviders() {
    return [
      {
        id: "google",
        name: "Google Gemini",
        description: "Google Gemini models including Gemini 2.5 Flash, 1.5 Pro, and Flash Lite.",
        defaultBaseUrl: "https://generativelanguage.googleapis.com",
        authType: "api_key",
        requiredFields: ["apiKey"],
        capabilities: ["chat", "streaming", "tools", "vision", "json_mode"],
      },
      {
        id: "openai",
        name: "OpenAI",
        description: "OpenAI models including GPT-4o, GPT-4o mini, o1, and o3.",
        defaultBaseUrl: "https://api.openai.com/v1",
        authType: "api_key",
        requiredFields: ["apiKey"],
        capabilities: ["chat", "streaming", "tools", "vision", "json_mode"],
      },
      {
        id: "anthropic",
        name: "Anthropic Claude",
        description: "Anthropic Claude models including Claude 3.7 Sonnet and Claude 3.5 Haiku.",
        defaultBaseUrl: "https://api.anthropic.com/v1",
        authType: "api_key",
        requiredFields: ["apiKey"],
        capabilities: ["chat", "streaming", "tools", "vision"],
      },
      {
        id: "openai_compatible",
        name: "OpenAI-Compatible / Local / Router",
        description: "Any OpenAI-compatible server (vLLM, Ollama, LM Studio, OpenRouter, Groq, Mistral, Together AI).",
        defaultBaseUrl: "http://127.0.0.1:11434/v1",
        authType: "api_key",
        requiredFields: ["baseUrl"],
        capabilities: ["chat", "streaming", "tools"],
      },
    ];
  }

  /**
   * Fetch a single provider connection by ID.
   * @param {string} connectionId
   */
  static async getConnectionById(connectionId) {
    if (!connectionId) return null;
    const res = await query(
      `SELECT *
       FROM provider_connections
       WHERE id = $1`,
      [connectionId]
    );
    if (!res.rows[0]) return null;
    return CredentialResolver.sanitize(res.rows[0]);
  }

  /**
   * Create a new provider connection with encrypted API key.
   * @param {{ workspaceId?: string|null, kind: string, name?: string|null, baseUrl?: string|null, apiKey?: string|null, isActive?: boolean }} params
   */
  static async createProviderConnection({ workspaceId = null, kind, name = null, baseUrl = null, apiKey = null, isActive = true }) {
    if (!kind || typeof kind !== "string") {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Provider kind is required");
    }
    const cleanKind = kind.toLowerCase().trim();
    const validKinds = ["google", "openai", "anthropic", "openai_compatible", "gemini"];
    if (!validKinds.includes(cleanKind)) {
      throw new ProviderServiceError("UNSUPPORTED_PROVIDER", 400, `Unsupported provider kind: '${kind}'`);
    }

    const normalizedKind = cleanKind === "gemini" ? "google" : cleanKind;

    if (normalizedKind === "openai_compatible") {
      if (!baseUrl || typeof baseUrl !== "string" || !baseUrl.trim()) {
        throw new ProviderServiceError("INVALID_INPUT", 400, "Base URL is required for OpenAI-compatible providers");
      }
      try {
        const parsed = new URL(baseUrl);
        if ((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.port === "8000") {
          throw new ProviderServiceError(
            "INVALID_INPUT",
            400,
            "Base URL cannot point to Sirona's own backend port (8000). For local models, configure your local LLM engine port (e.g. Ollama on 11434, LM Studio on 1234, or proxy on 31415)."
          );
        }
      } catch (e) {
        if (e instanceof ProviderServiceError) throw e;
      }
      const check = await validateSafeEndpointUrl(baseUrl, { allowLoopback: true });
      if (!check.ok) {
        throw new ProviderServiceError("SSRF_BLOCKED", 400, `Base URL rejected: ${check.reason}`);
      }
    }

    // No schema mutation here: old databases carry the same opaque ref in the existing column.
    const hasMetadata = (await query("SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='provider_connections' AND column_name='credential_ref') AS present")).rows[0].present;
    const ref = apiKey?.trim() ? CredentialResolver.storeCredential(apiKey.trim()) : null;
    const columns = hasMetadata ? ', credential_ref, credential_status, credential_migrated_at' : '';
    const extra = hasMetadata ? ", $5::text, $7, CASE WHEN $5::text IS NULL THEN NULL ELSE NOW() END" : '';
    const values = [workspaceId, normalizedKind, name || normalizedKind, baseUrl || null, ref, isActive !== false];
    if (hasMetadata) values.push(ref ? 'migrated' : 'none');
    const res = await query(
      `INSERT INTO provider_connections (workspace_id,kind,name,base_url,api_key_ciphertext,is_active${columns}) VALUES ($1,$2,$3,$4,$5::text,$6${extra}) RETURNING *`, values);

    return CredentialResolver.sanitize(res.rows[0]);
  }

  /**
   * Update an existing provider connection.
   * @param {string} connectionId
   * @param {{ name?: string, baseUrl?: string, apiKey?: string, isActive?: boolean }} [updates]
   */
  static async updateProviderConnection(connectionId, updates = {}) {
    const { name, baseUrl, apiKey, isActive } = updates;
    if (!connectionId) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Connection ID is required");
    }

    const existingRes = await query("SELECT * FROM provider_connections WHERE id = $1", [connectionId]);
    if (!existingRes.rows[0]) {
      throw new ProviderServiceError("NOT_FOUND", 404, `Provider connection ${connectionId} not found`);
    }
    const existing = existingRes.rows[0];

    const fields = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(name || existing.kind);
    }

    if (baseUrl !== undefined) {
      if (existing.kind === "openai_compatible" && baseUrl) {
        try {
          const parsed = new URL(baseUrl);
          if ((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.port === "8000") {
            throw new ProviderServiceError(
              "INVALID_INPUT",
              400,
              "Base URL cannot point to Sirona's own backend port (8000). For local models, configure your local LLM engine port (e.g. Ollama on 11434, LM Studio on 1234, or proxy on 31415)."
            );
          }
        } catch (e) {
          if (e instanceof ProviderServiceError) throw e;
        }
        const check = await validateSafeEndpointUrl(baseUrl, { allowLoopback: true });
        if (!check.ok) {
          throw new ProviderServiceError("SSRF_BLOCKED", 400, `Base URL rejected: ${check.reason}`);
        }
      }
      fields.push(`base_url = $${idx++}`);
      values.push(baseUrl);
    }

    if (apiKey !== undefined) {
      const ref = apiKey?.trim() ? CredentialResolver.storeCredential(apiKey.trim()) : null;
      fields.push(`api_key_ciphertext = $${idx++}`); values.push(ref);
      if (Object.hasOwn(existing, 'credential_ref')) {
        fields.push(`credential_ref = $${idx++}`); values.push(ref);
        fields.push(`credential_status = $${idx++}`); values.push(ref ? 'migrated' : 'none');
        fields.push(`credential_migrated_at = ${ref ? 'NOW()' : 'NULL'}`);
      }
    }

    if (isActive !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(Boolean(isActive));
    }

    if (fields.length === 0) {
      return this.getConnectionById(connectionId);
    }

    fields.push("updated_at = NOW()");
    values.push(connectionId);

    const res = await query(
      `UPDATE provider_connections
       SET ${fields.join(", ")}
       WHERE id = $${idx}
       RETURNING *`,
      values
    );

    return CredentialResolver.sanitize(res.rows[0]);
  }

  /**
   * Delete a provider connection.
   */
  static async deleteProviderConnection(connectionId) {
    if (!connectionId) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Connection ID is required");
    }
    const res = await query("DELETE FROM provider_connections WHERE id = $1 RETURNING id", [connectionId]);
    if (!res.rows[0]) {
      throw new ProviderServiceError("NOT_FOUND", 404, `Provider connection ${connectionId} not found`);
    }
    return { id: connectionId, deleted: true };
  }

  /**
   * Test live connectivity for a provider connection.
   */
  static async testProviderConnection(connectionId) {
    if (!connectionId) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Connection ID is required");
    }
    const res = await query("SELECT * FROM provider_connections WHERE id = $1", [connectionId]);
    if (!res.rows[0]) {
      throw new ProviderServiceError("NOT_FOUND", 404, `Provider connection ${connectionId} not found`);
    }
    const conn = res.rows[0];
    const resolved = CredentialResolver.resolveCredential(conn);
    if (resolved.status === "requires_reauth") {
      throw new ProviderServiceError("CREDENTIAL_REAUTH_REQUIRED", 401, `Provider credentials require re-authentication: ${resolved.error || 'decryption failed'}`);
    }
    const apiKey = resolved.apiKey;
    const kind = conn.kind;
    const baseUrl = conn.base_url;

    if (!apiKey && kind !== "openai_compatible") {
      throw new ProviderServiceError("API_KEY_REQUIRED", 400, `API key is required to test ${kind} connection`);
    }

    const start = Date.now();
    try {
      if (kind === "google" || kind === "gemini") {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1`;
        const testRes = await safeFetch(url, { headers: { "Accept": "application/json" }, allowLoopback: false, timeoutMs: 15000 });
        if (!testRes.ok) {
          if (testRes.status === 400 || testRes.status === 401 || testRes.status === 403) {
            throw new ProviderServiceError("AUTH_FAILED", 401, "Google Gemini authentication failed. Invalid API key.");
          }
          throw new ProviderServiceError("PROVIDER_ERROR", testRes.status, `Google Gemini API error: ${testRes.statusText}`);
        }
      } else if (kind === "openai") {
        const testRes = await safeFetch("https://api.openai.com/v1/models", {
          headers: { "Authorization": `Bearer ${apiKey}`, "Accept": "application/json" },
          allowLoopback: false,
          timeoutMs: 15000,
        });
        if (!testRes.ok) {
          if (testRes.status === 401) {
            throw new ProviderServiceError("AUTH_FAILED", 401, "OpenAI authentication failed. Invalid API key.");
          }
          throw new ProviderServiceError("PROVIDER_ERROR", testRes.status, `OpenAI API error: ${testRes.statusText}`);
        }
      } else if (kind === "anthropic") {
        const testRes = await safeFetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Accept": "application/json" },
          allowLoopback: false,
          timeoutMs: 15000,
        });
        if (!testRes.ok) {
          if (testRes.status === 401 || testRes.status === 403) {
            throw new ProviderServiceError("AUTH_FAILED", 401, "Anthropic authentication failed. Invalid API key.");
          }
          throw new ProviderServiceError("PROVIDER_ERROR", testRes.status, `Anthropic API error: ${testRes.statusText}`);
        }
      } else if (kind === "openai_compatible") {
        if (!baseUrl) {
          throw new ProviderServiceError("BASE_URL_REQUIRED", 400, "Base URL is required for OpenAI-compatible providers");
        }
        let modelsUrl = baseUrl.replace(/\/+$/, "");
        if (!modelsUrl.endsWith("/models")) modelsUrl += "/models";
        const headers = { "Accept": "application/json" };
        if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
        const testRes = await safeFetch(modelsUrl, { headers, allowLoopback: true, timeoutMs: 15000 });
        if (!testRes.ok) {
          if (testRes.status === 401 || testRes.status === 403) {
            throw new ProviderServiceError("AUTH_FAILED", 401, "Provider authentication failed. Invalid API key.");
          }
          throw new ProviderServiceError("PROVIDER_ERROR", testRes.status, `Provider returned ${testRes.status}: ${testRes.statusText}`);
        }
      }
    } catch (err) {
      if (err instanceof ProviderServiceError) throw err;
      throw new ProviderServiceError(
        err.code === "SSRF_BLOCKED" ? "SSRF_BLOCKED" : "CONNECTION_FAILED",
        err.status || 502,
        `Failed to reach provider endpoint: ${err.message}`
      );
    }

    const latencyMs = Date.now() - start;
    return {
      ok: true,
      latencyMs,
      provider: kind,
      message: `Successfully connected to ${conn.name || kind} (${latencyMs}ms)`,
    };
  }

  /**
   * Refresh models discovered from a specific provider connection.
   */
  static async refreshConnectionModels(connectionId) {
    if (!connectionId) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Connection ID is required");
    }
    const res = await query("SELECT * FROM provider_connections WHERE id = $1", [connectionId]);
    if (!res.rows[0]) {
      throw new ProviderServiceError("NOT_FOUND", 404, `Provider connection ${connectionId} not found`);
    }
    const conn = res.rows[0];
    const resolved = CredentialResolver.resolveCredential(conn);
    if (resolved.status === "requires_reauth") {
      throw new ProviderServiceError("CREDENTIAL_REAUTH_REQUIRED", 401, `Provider credentials require re-authentication: ${resolved.error || 'decryption failed'}`);
    }
    const apiKey = resolved.apiKey;
    const discovered = await this.discoverModels(conn.kind, { apiKey, baseUrl: conn.base_url, connectionId: conn.id });
    return {
      refreshed: true,
      count: discovered.length,
      models: discovered,
    };
  }

  /**
   * Retrieve model defaults and routing preferences.
   */
  static async getModelSettings() {
    const raw = await Setting.get("model_settings");
    const settings = typeof raw === "object" && raw !== null ? raw : {};
    const primaryModel = settings.primaryModel || (await Setting.get("primary_model")) || "gemini-2.5-flash";
    const fallbackModel = settings.fallbackModel || (await Setting.get("fallback_model")) || "gpt-4o";
    const auxiliaryModels = settings.auxiliaryModels || (await Setting.get("auxiliary_models")) || {
      fast: "gemini-flash-lite-latest",
      reasoning: "gemini-1.5-pro",
      embedding: "text-embedding-004",
    };
    return {
      primaryModel: typeof primaryModel === "string" ? primaryModel : "gemini-2.5-flash",
      fallbackModel: typeof fallbackModel === "string" ? fallbackModel : "gpt-4o",
      auxiliaryModels: typeof auxiliaryModels === "object" && auxiliaryModels !== null ? auxiliaryModels : {
        fast: "gemini-flash-lite-latest",
        reasoning: "gemini-1.5-pro",
        embedding: "text-embedding-004",
      },
    };
  }

  /**
   * Update model defaults and routing preferences.
   * @param {{ primaryModel?: string, fallbackModel?: string, auxiliaryModels?: Record<string, string> }} [updates]
   */
  static async updateModelSettings(updates = {}) {
    const { primaryModel, fallbackModel, auxiliaryModels } = updates;
    const current = await this.getModelSettings();
    if (primaryModel !== undefined && (typeof primaryModel !== "string" || !primaryModel.trim())) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "primaryModel must be a non-empty string");
    }
    if (fallbackModel !== undefined && (typeof fallbackModel !== "string" || !fallbackModel.trim())) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "fallbackModel must be a non-empty string");
    }
    if (auxiliaryModels !== undefined && (typeof auxiliaryModels !== "object" || auxiliaryModels === null)) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "auxiliaryModels must be an object");
    }

    const updated = {
      primaryModel: primaryModel !== undefined ? primaryModel.trim() : current.primaryModel,
      fallbackModel: fallbackModel !== undefined ? fallbackModel.trim() : current.fallbackModel,
      auxiliaryModels: auxiliaryModels !== undefined ? { ...current.auxiliaryModels, ...auxiliaryModels } : current.auxiliaryModels,
    };

    await Setting.set("model_settings", updated);
    return updated;
  }

  /**
   * Test connection and discover models from a provider.
   * Fails fast if credentials are invalid or provider is unreachable.
   *
   * @param {string} providerKind
   * @param {object} [opts]
   * @param {string} [opts.apiKey]
   * @param {string} [opts.baseUrl]
   * @param {string} [opts.connectionId]
   * @returns {Promise<Array<{id: string, name: string, provider_kind: string, context_window: number, max_output_tokens: number}>>}
   */
  static async discoverModels(providerKind, { apiKey = null, baseUrl = null, connectionId = null } = {}) {
    const kind = (providerKind || "").toLowerCase();
    const key = apiKey || (await this.getApiKey(kind));
    if (!key && kind !== "openai_compatible") {
      throw new ProviderServiceError("API_KEY_REQUIRED", 400, `API key required before discovering models for '${kind}'`);
    }

    let discovered = [];

    if (kind === "google" || kind === "gemini") {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`;
      const res = await safeFetch(url, { headers: { "Accept": "application/json" }, allowLoopback: false, timeoutMs: 15000 });
      if (!res.ok) {
        if (res.status === 400 || res.status === 403 || res.status === 401) {
          throw new ProviderServiceError("AUTH_FAILED", 401, "Google Gemini authentication failed. Invalid API key.");
        }
        throw new ProviderServiceError("PROVIDER_ERROR", res.status, `Google Gemini API error: ${res.statusText}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data.models) ? data.models : [];
      discovered = rawList
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => {
          const id = m.name ? m.name.replace(/^models\//, "") : "";
          return {
            id,
            name: m.displayName || id,
            provider_kind: "google",
            context_window: m.inputTokenLimit || 1048576,
            max_output_tokens: m.outputTokenLimit || 8192,
          };
        })
        .filter((m) => m.id.length > 0);
    } else if (kind === "openai") {
      const res = await safeFetch("https://api.openai.com/v1/models", {
        headers: {
          "Authorization": `Bearer ${key}`,
          "Accept": "application/json",
        },
        allowLoopback: false,
        timeoutMs: 15000,
      });
      if (!res.ok) {
        if (res.status === 401) {
          throw new ProviderServiceError("AUTH_FAILED", 401, "OpenAI authentication failed. Invalid API key.");
        }
        throw new ProviderServiceError("PROVIDER_ERROR", res.status, `OpenAI API error: ${res.statusText}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : [];
      discovered = rawList
        .filter((m) => typeof m.id === "string" && (
          m.id.startsWith("gpt-") || m.id.startsWith("o1") || m.id.startsWith("o3") || m.id.startsWith("chatgpt-")
        ))
        .map((m) => ({
          id: m.id,
          name: m.id,
          provider_kind: "openai",
          context_window: 128000,
          max_output_tokens: 4096,
        }));
    } else if (kind === "anthropic") {
      const res = await safeFetch("https://api.anthropic.com/v1/models", {
        headers: {
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "Accept": "application/json",
        },
        allowLoopback: false,
        timeoutMs: 15000,
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new ProviderServiceError("AUTH_FAILED", 401, "Anthropic authentication failed. Invalid API key.");
        }
        throw new ProviderServiceError("PROVIDER_ERROR", res.status, `Anthropic API error: ${res.statusText}`);
      }
      const data = await res.json();
      const rawList = Array.isArray(data.data) ? data.data : [];
      discovered = rawList
        .filter((m) => typeof m.id === "string" && m.id.startsWith("claude-"))
        .map((m) => ({
          id: m.id,
          name: m.display_name || m.id,
          provider_kind: "anthropic",
          context_window: 200000,
          max_output_tokens: 8192,
        }));
    } else if (kind === "openai_compatible") {
      const targetBase = baseUrl || (await this.getBaseUrl(kind));
      if (!targetBase) {
        throw new ProviderServiceError("BASE_URL_REQUIRED", 400, "Base URL is required for OpenAI-compatible providers");
      }

      let modelsUrl = targetBase.replace(/\/+$/, "");
      if (!modelsUrl.endsWith("/models")) {
        modelsUrl += "/models";
      }

      let res;
      try {
        const headers = { "Accept": "application/json" };
        if (key) headers["Authorization"] = `Bearer ${key}`;
        res = await safeFetch(modelsUrl, {
          headers,
          allowLoopback: true,
          timeoutMs: 15000,
        });
      } catch (networkErr) {
        throw new ProviderServiceError(
          networkErr.code === "SSRF_BLOCKED" ? "SSRF_BLOCKED" : "CONNECTION_FAILED",
          networkErr.status || 502,
          `Failed to connect to ${modelsUrl}: ${networkErr.message}`
        );
      }

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new ProviderServiceError("AUTH_FAILED", 401, "Custom provider authentication failed. Invalid API key.");
        }
        throw new ProviderServiceError("PROVIDER_ERROR", res.status, `Custom provider error (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      let rawList = [];
      if (Array.isArray(data)) rawList = data;
      else if (data && Array.isArray(data.data)) rawList = data.data;
      else if (data && Array.isArray(data.models)) rawList = data.models;

      discovered = rawList
        .map((m) => {
          const id = typeof m === "string" ? m : m.id || m.name || "";
          const name = typeof m === "string" ? m : m.name || m.id || "";
          return {
            id,
            name,
            provider_kind: "openai_compatible",
            context_window: 128000,
            max_output_tokens: 8192,
          };
        })
        .filter((m) => m.id.length > 0);
    } else {
      throw new ProviderServiceError("UNSUPPORTED_PROVIDER", 400, `Unsupported provider kind: '${kind}'`);
    }

    // Upsert discovered models into PostgreSQL models table
    const CANONICAL_PROVIDERS = {
      "gemini-2.5-flash": "google",
      "gemini-1.5-pro": "google",
      "gemini-flash-lite-latest": "google",
      "gpt-4o": "openai",
      "gpt-4o-mini": "openai",
      "claude-3-7-sonnet-20250219": "anthropic",
    };

    for (const m of discovered) {
      const canonicalProvider = CANONICAL_PROVIDERS[m.id];
      const targetProvider = canonicalProvider && canonicalProvider !== m.provider_kind ? canonicalProvider : m.provider_kind;
      await query(
        `INSERT INTO models (id, provider_kind, name, context_window, max_output_tokens, is_available, provider_connection_id)
         VALUES ($1, $2, $3, $4, $5, true, $6)
         ON CONFLICT (id) DO UPDATE SET is_available = true, name = EXCLUDED.name, provider_kind = $2, provider_connection_id = COALESCE($6, models.provider_connection_id)`,
        [m.id, targetProvider, m.name, m.context_window, m.max_output_tokens, connectionId || null]
      );
    }

    return discovered;
  }

  /**
   * Save or verify a provider's connection credentials.
   */
  static async saveProviderConnection({ workspaceId = null, kind, name, baseUrl = null, apiKey = null, discover = false }) {
    if (!kind) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Provider kind is required");
    }

    let resolvedKey = apiKey;
    if (!apiKey) {
      if (!discover) {
        throw new ProviderServiceError("INVALID_INPUT", 400, "Provider kind and API key are required");
      }
      const owned=(await query('SELECT * FROM provider_connections WHERE workspace_id=$1 AND kind=$2 AND is_active=true ORDER BY updated_at DESC LIMIT 1',[workspaceId,kind])).rows[0];
      resolvedKey = owned ? CredentialResolver.resolveCredential(owned).apiKey : null;
      if (!resolvedKey) {
        throw new ProviderServiceError("INVALID_INPUT", 400, "Provider kind and API key are required");
      }
    }

    if (kind === "openai_compatible" && !baseUrl) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Base URL is mandatory for OpenAI-compatible providers");
    }

    if (baseUrl) {
      try {
        const parsed = new URL(baseUrl);
        if ((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.port === "8000") {
          throw new ProviderServiceError(
            "INVALID_INPUT",
            400,
            "Base URL cannot point to Sirona's own backend port (8000). For local models, configure your local LLM engine port (e.g. Ollama on 11434, LM Studio on 1234, or proxy on 31415)."
          );
        }
      } catch (err) {
        if (err instanceof ProviderServiceError) throw err;
      }
    }

    let connection;
    if (apiKey) {
      connection = await this.createProviderConnection({workspaceId, kind, name, baseUrl, apiKey});
    } else {
      const res = await query(
        "SELECT * FROM provider_connections WHERE workspace_id=$1 AND kind=$2 AND is_active=true ORDER BY updated_at DESC LIMIT 1",
        [workspaceId,kind]
      );
      connection = res.rows[0] ? CredentialResolver.sanitize(res.rows[0]) : {
        id: "default",
        workspaceId,
        kind,
        name: name || kind,
        baseUrl,
        isActive: true,
        hasApiKey: false,
        credentialRef: null,
        credentialStatus: "none",
      };
    }

    let discoveredModels = [];
    if (discover) {
      discoveredModels = await this.discoverModels(kind, { apiKey: resolvedKey, baseUrl, connectionId: connection?.id });
    }

    return { connection, models: discoveredModels, count: discoveredModels.length };
  }

  /**
   * Execute an authenticated, governed, and budget-settled turn.
   * Streams tokens via onToken callback and persists user + assistant messages.
   *
   * @param {object} params
   * @param {string} params.conversationId
   * @param {string} params.prompt
   * @param {string} [params.modelId]
   * @param {function(string): void} [params.onToken]
   * @param {string|null} [params.actorId]
   * @param {AbortSignal|null} [params.signal]
   * @param {string|null} [params.leaseOwner]
   * @param {string|null} [params.clientTurnId]
   * @param {string|null} [params.retryUserMessageId]
   * @param {boolean} [params.nativeChat]
   * @param {string|null} [params.adapter]
   * @param {{maxTokens:number,deadlineMs:number,ceilingMicroUsd:string,operationKey:string}|null} [params.activityLimits]
   */
  static async executeTurn({
    conversationId,
    prompt,
    modelId = "gemini-3.5-flash",
    onToken = () => {},
    actorId: _actorId = null,
    signal = null,
    leaseOwner = null,
    clientTurnId = null,
    retryUserMessageId = null,
    nativeChat = false,
    adapter = null,
    activityLimits = null,
    projectId = null,
  }) {
    if(activityLimits!==null){
      const keys=Object.keys(activityLimits);
      if(keys.some(k=>!['maxTokens','deadlineMs','ceilingMicroUsd','operationKey'].includes(k))||!Number.isSafeInteger(activityLimits.maxTokens)||activityLimits.maxTokens<1||activityLimits.maxTokens>8192||!Number.isSafeInteger(activityLimits.deadlineMs)||activityLimits.deadlineMs<1||activityLimits.deadlineMs>120000||typeof activityLimits.ceilingMicroUsd!=='string'||! /^[1-9][0-9]{0,8}$/.test(activityLimits.ceilingMicroUsd)||typeof activityLimits.operationKey!=='string'||!activityLimits.operationKey.length||activityLimits.operationKey.length>100)
        throw new ProviderServiceError('INVALID_ACTIVITY_LIMITS',400,'Valid bounded activity limits are required');
      signal=AbortSignal.any([AbortSignal.timeout(activityLimits.deadlineMs),...(signal?[signal]:[])]);
      nativeChat=true; // Exact model identity; no unreviewed fallback for bounded activities.
    }
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      throw new ProviderServiceError("INVALID_INPUT", 400, "Prompt must not be empty");
    }

    if (signal?.aborted) {
      throw Object.assign(new Error("Turn execution cancelled"), { code: "TURN_CANCELLED", status: 499 });
    }

    // 1. Verify session exists
    const sessionRes = await query("SELECT * FROM sessions WHERE id = $1", [conversationId]);
    if (sessionRes.rows.length === 0) {
      throw new ProviderServiceError("CONVERSATION_NOT_FOUND", 404, `Conversation ${conversationId} not found`);
    }
    const session = sessionRes.rows[0];
    const effectiveProjectId = projectId || session.project_id;
    let projectSystemPrompt = null;
    if (effectiveProjectId) {
      try {
        const projRes = await query("SELECT id, name, description, primary_path, detected_framework FROM projects WHERE id = $1", [effectiveProjectId]);
        const proj = projRes.rows[0];
        if (proj) {
          projectSystemPrompt = buildProjectPrompt(proj);
        }
      } catch (err) {
        console.warn("[ProviderService] Failed to load project prompt:", err?.message);
      }
    }
    const projectIdForBudget = effectiveProjectId;

    // 2. Verify single-writer turn lease
    const activeLease = await TurnLease.getLease(conversationId);
    if (!activeLease || !activeLease.is_active) {
      throw new ProviderServiceError("TURN_LEASE_REQUIRED", 409, "Active turn lease is required to execute a turn");
    }
    if (activeLease.holder.startsWith('desktop:') && activeLease.holder !== leaseOwner) {
      throw new ProviderServiceError('TURN_LEASE_CONFLICT',409,'The active desktop turn owns this conversation');
    }

    // 3. Resolve model profile
    let model = await this.getModelById(modelId);
    if (!model) {
      model = {
        id: modelId,
        provider_kind: AIService.resolveProvider(modelId),
        name: modelId,
        context_window: 128000,
        max_output_tokens: 8192,
        input_cost_micro_usd_per_m: 250000,
        output_cost_micro_usd_per_m: 1000000,
      };
    }

    // 4. Resolve API key & base URL
    const baseUrl = model.resolvedBaseUrl || (await this.getBaseUrl(model.provider_kind));
    const apiKey = model.resolvedApiKey || (await this.getApiKey(model.provider_kind));
    if (!apiKey && model.provider_kind !== "openai_compatible") {
      throw new ProviderServiceError(
        "API_KEY_REQUIRED",
        400,
        `No API key configured for provider '${model.provider_kind}'. Set ${model.provider_kind.toUpperCase()}_API_KEY in Settings or environment.`
      );
    }

    // 5. Governance policy evaluation
    const currentPolicy = await GovernanceService.getCurrentPolicy();
    const policyEval = GovernanceService.evaluatePolicy(currentPolicy, {
      action: "ai_inference",
      highImpact: false,
      costMicroUsd: 100000, // estimated pre-flight
    });

    if (!policyEval.allowed) {
      throw new ProviderServiceError("POLICY_DENIED", 403, policyEval.reason || "Policy denied inference action");
    }

    // 6. Stage 05 Budget Reservation (atomic row lock)
    let reservationId = null;
    let budgetAccount = null;
    if (projectIdForBudget) {
      const budgets = await GovernanceService.getBudgets(projectIdForBudget);
      budgetAccount = budgets[0] || null;
      if (budgetAccount) {
        const reservation = await GovernanceService.reserveBudget(budgetAccount.id, {
          operationKey: activityLimits?.operationKey ?? `turn-${conversationId}-${Date.now()}`,
          ceilingMicroUsd: activityLimits?.ceilingMicroUsd ?? 500000, // Ordinary-chat behavior preserved.
        });
        reservationId = reservation.id;
      }
    }

    // 7. Persist user message in PostgreSQL with durable status 'completed' (NEVER deleted on failure)
    const promptTokens = Math.max(1, Math.ceil(prompt.length / 4));
    // Persist the pair atomically: an interrupted insert cannot leave an unretryable orphan user message.
    let pair;
    try {
      pair = await transaction(async client => {
        const userRes = retryUserMessageId
          ? await client.query("SELECT * FROM messages WHERE id=$1 AND session_id=$2 AND role='user'",[retryUserMessageId,conversationId])
          : await client.query(`INSERT INTO messages(session_id,role,content,tokens,status,created_at,client_turn_id)
              VALUES($1,'user',$2,$3,'completed',NOW(),$4) RETURNING *`,[conversationId,prompt.trim(),promptTokens,clientTurnId]);
        if(!userRes.rows[0])throw new ProviderServiceError('INVALID_RETRY',409,'Saved user message not found');
        const assistantRes=await client.query(`INSERT INTO messages(session_id,role,content,tokens,status,created_at,client_turn_id)
          VALUES($1,'assistant','',0,'pending',NOW(),$2) RETURNING *`,[conversationId,clientTurnId]);
        return {user:userRes.rows[0],assistantId:assistantRes.rows[0].id};
      });
    } catch(error) {
      if(reservationId)await GovernanceService.releaseReservation(reservationId).catch(()=>{});
      throw error;
    }
    const userMessage=pair.user;
    const assistantMessageId=pair.assistantId;

    // 9. Fetch conversation history for multi-turn context (excluding this pending turn)
    const historyRes = await query(
      `SELECT role,content FROM (SELECT id,role,content FROM messages
       WHERE session_id = $1 AND active = 1 AND id != $2 AND (role != 'assistant' OR status = 'completed')
       ORDER BY id DESC LIMIT 30) recent ORDER BY id ASC`,
      [conversationId, assistantMessageId]
    );
    const messages = historyRes.rows;

    // 10. Execute model turn with streaming, abort tracking, and eligible fallback routing
    if (baseUrl) {
      try {
        const parsed = new URL(baseUrl);
        if ((parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost") && parsed.port === "8000") {
          throw new ProviderServiceError(
            "INVALID_INPUT",
            400,
            "Base URL cannot point to Sirona's own backend port (8000). For local models, configure your local LLM engine port (e.g. Ollama on 11434, LM Studio on 1234, or proxy on 31415)."
          );
        }
      } catch (e) {
        if (e instanceof ProviderServiceError) throw e;
      }
      const check = await validateSafeEndpointUrl(baseUrl, { allowLoopback: true });
      if (!check.ok) {
        throw new ProviderServiceError("SSRF_BLOCKED", 400, `Inference base URL rejected: ${check.reason}`);
      }
    }
    const startTime = Date.now();
    let tokenEmitted = false;
    let streamStarted = false;

    const wrappedOnToken = (token) => {
      if(signal?.aborted)throw Object.assign(new Error('Turn execution cancelled'),{code:'TURN_CANCELLED',status:499});
      if (!streamStarted) {
        streamStarted = true;
        query("UPDATE messages SET status = 'streaming' WHERE id = $1", [assistantMessageId]).catch(() => {});
      }
      tokenEmitted = true;
      onToken(token);
      if(signal?.aborted)throw Object.assign(new Error('Turn execution cancelled'),{code:'TURN_CANCELLED',status:499});
    };

    let activeModel = model;
    let streamResult;

    try {
      if (signal?.aborted) {
        throw Object.assign(new Error("Turn execution cancelled"), { code: "TURN_CANCELLED", status: 499 });
      }

      try {
        streamResult = await AIService.streamTurn({
          model: activeModel.id,
          providerKind: activeModel.provider_kind,
          nativeChat,
          messages,
          systemPrompt: projectSystemPrompt,
          onToken: wrappedOnToken,
          apiKey,
          baseUrl,
          signal,
          adapter,
          maxTokens: activityLimits?.maxTokens,
        });
      } catch (primaryErr) {
        // Fallback routing: only eligible if failure occurred BEFORE visible tokens or irreversible output
        const isEligible =
          !nativeChat &&
          !tokenEmitted &&
          !signal?.aborted &&
          (primaryErr.status === 404 ||
            primaryErr.status === 429 ||
            primaryErr.status >= 500 ||
            primaryErr.code === "CONNECTION_FAILED" ||
            primaryErr.message?.includes("not found") ||
            primaryErr.message?.includes("no longer available") ||
            primaryErr.message?.includes("Quota exceeded") ||
            primaryErr.message?.includes("RESOURCE_EXHAUSTED"));

        let fallbackSuccess = false;
        if (isEligible) {
          const modelSettings = await this.getModelSettings();
          const fallbackModelId = modelSettings?.fallbackModel || "gemini-flash-lite-latest";
          if (fallbackModelId && fallbackModelId !== activeModel.id) {
            let fallbackModel = await this.getModelById(fallbackModelId);
            if (!fallbackModel) {
              fallbackModel = {
                id: fallbackModelId,
                provider_kind: AIService.resolveProvider(fallbackModelId),
                name: fallbackModelId,
                context_window: 128000,
                max_output_tokens: 8192,
                input_cost_micro_usd_per_m: 250000,
                output_cost_micro_usd_per_m: 1000000,
              };
            }
            const fallbackKey = fallbackModel.resolvedApiKey || (await this.getApiKey(fallbackModel.provider_kind));
            if (fallbackKey || fallbackModel.provider_kind === "openai_compatible") {
              const fallbackBaseUrl = fallbackModel.resolvedBaseUrl || (await this.getBaseUrl(fallbackModel.provider_kind));
              if (fallbackBaseUrl) {
                const check = await validateSafeEndpointUrl(fallbackBaseUrl, { allowLoopback: true });
                if (!check.ok) {
                  console.warn(`[ProviderService] Fallback base URL failed SSRF check: ${check.reason}`);
                  throw new ProviderServiceError("SSRF_BLOCKED", 400, `Fallback base URL rejected: ${check.reason}`);
                }
              }
              try {
                console.log(`[ProviderService] Primary model '${activeModel.id}' failed, executing fallback to '${fallbackModel.id}'`);
                streamResult = await AIService.streamTurn({
                  model: fallbackModel.id,
                  providerKind: fallbackModel.provider_kind,
                  messages,
                  systemPrompt: projectSystemPrompt,
                  onToken: wrappedOnToken,
                  apiKey: fallbackKey,
                  baseUrl: fallbackBaseUrl,
                  signal,
                });
                activeModel = fallbackModel;
                fallbackSuccess = true;
              } catch (fallbackErr) {
                console.error(`[ProviderService] Fallback to '${fallbackModel.id}' also failed:`, fallbackErr.message);
              }
            }
          }
        }

        if (!fallbackSuccess) {
          throw primaryErr;
        }
      }
      if(activityLimits && (!streamResult.usage || !Number.isSafeInteger(streamResult.usage.promptTokens) || !Number.isSafeInteger(streamResult.usage.completionTokens) || !Number.isSafeInteger(streamResult.usage.totalTokens) || streamResult.usage.totalTokens<=0))throw new ProviderServiceError('USAGE_OUTCOME_UNKNOWN',409,'Bounded activity requires reported usage; retain its reservation for reconciliation');
    } catch (providerError) {
      const turnErr=activityLimits?Object.assign(new Error('Bounded model activity failed; retained charges may require reconciliation'),{code:providerError.code??'MODEL_ACTIVITY_FAILED',status:providerError.status??502,name:providerError.name}):providerError;
      const durationMs = Date.now() - startTime;
      const isAbort = signal?.aborted || turnErr.name === "AbortError" || turnErr.code === "TURN_CANCELLED";
      const finalStatus = isAbort ? "cancelled" : "failed";

      // Release budget reservation cleanly on failure/abort
      if (reservationId) {
        try {
          await GovernanceService.releaseReservation(reservationId);
        } catch {}
      }

      // Persist failure/cancellation state in assistant message (user prompt is safely preserved!)
      await query(
        `UPDATE messages
         SET status = $1, content = $2, duration_ms = $3
         WHERE id = $4`,
        [finalStatus, isAbort ? "[Turn cancelled by client]" : `[Error: ${turnErr.message}]`, durationMs, assistantMessageId]
      );

      // Log failure in model_calls table
      await query(
        `INSERT INTO model_calls (
           session_id, project_id, model_id, provider_kind,
           prompt_tokens, completion_tokens, total_tokens, cost_micro_usd,
           budget_reservation_id, status, duration_ms, error_message
         ) VALUES ($1, $2, $3, $4, $5, 0, $5, 0, $6, $7, $8, $9)`,
        [
          conversationId,
          projectId,
          activeModel.id,
          activeModel.provider_kind,
          promptTokens,
          reservationId,
          isAbort ? "aborted" : "failed",
          durationMs,
          turnErr.message,
        ]
      );

      throw turnErr;
    }

    const durationMs = Date.now() - startTime;

    // 11. Determine reported usage from streamResult (Vercel AI SDK or native)
    const reportedPromptTokens = streamResult.usage?.promptTokens;
    const actualPromptTokens = reportedPromptTokens && reportedPromptTokens > 0
      ? reportedPromptTokens
      : promptTokens;

    const reportedCompletionTokens = streamResult.usage?.completionTokens;
    const actualCompletionTokens = Math.max(
      1,
      reportedCompletionTokens && reportedCompletionTokens > 0
        ? reportedCompletionTokens
        : (streamResult.tokens || Math.ceil(streamResult.content.length / 4))
    );

    const reportedTotalTokens = streamResult.usage?.totalTokens;
    const actualTotalTokens = reportedTotalTokens && reportedTotalTokens > 0
      ? reportedTotalTokens
      : (actualPromptTokens + actualCompletionTokens);

    // Update user message tokens in PostgreSQL if reported by upstream provider
    if (reportedPromptTokens && userMessage?.id) {
      await query("UPDATE messages SET tokens = $1 WHERE id = $2", [actualPromptTokens, userMessage.id]);
    }

    // Persist completed assistant message in PostgreSQL
    const assistantMsgRes = await query(
      `UPDATE messages
       SET content = $1, tokens = $2, reasoning = $3, duration_ms = $4, status = 'completed'
       WHERE id = $5
       RETURNING *`,
      [
        streamResult.content,
        actualCompletionTokens,
        streamResult.reasoning || null,
        durationMs,
        assistantMessageId,
      ]
    );
    const assistantMessage = assistantMsgRes.rows[0];

    // 12. Calculate token cost & record model call with exact reported usage
    const inCost = BigInt(activeModel.input_cost_micro_usd_per_m || 250000);
    const outCost = BigInt(activeModel.output_cost_micro_usd_per_m || 1000000);
    const costMicroUsd = Number(
      (BigInt(actualPromptTokens) * inCost + BigInt(actualCompletionTokens) * outCost) / 1000000n
    );

    // Record model_calls log
    await query(
      `INSERT INTO model_calls (
         session_id, project_id, model_id, provider_kind,
         prompt_tokens, completion_tokens, total_tokens, cost_micro_usd,
         budget_reservation_id, status, duration_ms
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'success', $10)`,
      [
        conversationId,
        projectId,
        activeModel.id,
        activeModel.provider_kind,
        actualPromptTokens,
        actualCompletionTokens,
        actualTotalTokens,
        costMicroUsd,
        reservationId,
        durationMs,
      ]
    );

    // 13. Settle budget reservation with actual spent micro-USD
    if (reservationId) {
      await GovernanceService.settleReservation(reservationId, {
        actualSpentMicroUsd: costMicroUsd,
      });
    }

    return {
      userMessage,
      assistantMessage,
      usage: {
        model: activeModel.id,
        provider: activeModel.provider_kind,
        promptTokens: actualPromptTokens,
        completionTokens: actualCompletionTokens,
        totalTokens: actualTotalTokens,
        costMicroUsd,
        durationMs,
      },
    };
  }
}

export default ProviderService;
