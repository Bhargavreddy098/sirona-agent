
import crypto from "crypto";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Setting } from "../model/Setting.js";

/* =====================================================================
   Multi-Provider AI Service
   - Official Google ADK (@google/genai)
   - Official OpenAI SDK (openai)
   - Official Anthropic SDK (@anthropic-ai/sdk)
   ===================================================================== */

export class AIService {
  static async getApiKey(provider) {
    const p = (provider || "").toLowerCase();
    // 1. Check desktop_settings in PostgreSQL
    let settings = {};
    try {
      settings = await Setting.getAll();
    } catch {
      // Offline/uninitialized DB
    }
    if ((p === "gemini" || p === "google") && settings.gemini_api_key) return settings.gemini_api_key;
    if (p === "openai" && settings.openai_api_key) return settings.openai_api_key;
    if (p === "anthropic" && settings.anthropic_api_key) return settings.anthropic_api_key;
    if (p === "openai_compatible" && settings.custom_api_key) return settings.custom_api_key;

    // 2. Fall back to environment variable
    if (p === "gemini" || p === "google") return process.env.GEMINI_API_KEY || null;
    if (p === "openai") return process.env.OPENAI_API_KEY || null;
    if (p === "anthropic") return process.env.ANTHROPIC_API_KEY || null;
    if (p === "openai_compatible") return process.env.OPENAI_COMPATIBLE_API_KEY || process.env.CUSTOM_API_KEY || null;
    return null;
  }

  static async getBaseUrl(provider) {
    const p = (provider || "").toLowerCase();
    if (p === "openai_compatible") {
      let settings = {};
      try {
        settings = await Setting.getAll();
      } catch {
        // Offline/uninitialized DB
      }
      return settings.custom_base_url || process.env.OPENAI_COMPATIBLE_BASE_URL || process.env.CUSTOM_BASE_URL || null;
    }
    if (p === "openai") {
      return process.env.OPENAI_BASE_URL || null;
    }
    return null;
  }

  /**
   * Determine provider based on model identifier
   */
  static resolveProvider(modelName = "gemini-3-flash-preview") {
    const lower = modelName.toLowerCase();
    if (lower.startsWith("gpt") || lower.startsWith("o1") || lower.startsWith("o3")) {
      return "openai";
    }
    if (lower.startsWith("claude")) {
      return "anthropic";
    }
    if (lower.startsWith("custom") || lower.includes("compatible") || lower.includes("local")) {
      return "openai_compatible";
    }
    return "google";
  }

  /**
   * Normalize and convert tool schemas for Google Gemini ADK
   * @param {Array<any>} tools
   */
  static formatToolsForGemini(tools = []) {
    if (!tools || tools.length === 0) return [];

    const normalizeType = (val) => {
      if (!val || typeof val !== "object") return val;
      const res = { ...val };
      if (typeof res.type === "string") {
        res.type = res.type.toUpperCase();
      }
      if (res.properties && typeof res.properties === "object") {
        const props = {};
        for (const [k, v] of Object.entries(res.properties)) {
          props[k] = normalizeType(v);
        }
        res.properties = props;
      }
      if (res.items && typeof res.items === "object") {
        res.items = normalizeType(res.items);
      }
      return res;
    };

    const declarations = tools.map((t) => {
      const fn = t.function || t;
      return {
        name: fn.name,
        description: fn.description || "",
        parameters: normalizeType(fn.parameters || { type: "OBJECT", properties: {}, required: [] }),
      };
    });

    return [{ functionDeclarations: declarations }];
  }

  /**
   * Normalize and convert tool schemas for OpenAI
   * @param {Array<any>} tools
   */
  static formatToolsForOpenAI(tools = []) {
    if (!tools || tools.length === 0) return [];
    return tools.map((t) => {
      if (t.type === "function") return t;
      return {
        type: "function",
        function: {
          name: t.name,
          description: t.description || "",
          parameters: t.parameters || { type: "object", properties: {}, required: [] },
        },
      };
    });
  }

  /**
   * Normalize and convert tool schemas for Anthropic
   * @param {Array<any>} tools
   */
  static formatToolsForAnthropic(tools = []) {
    if (!tools || tools.length === 0) return [];
    return tools.map((t) => {
      const fn = t.function || t;
      return {
        name: fn.name,
        description: fn.description || "",
        input_schema: fn.parameters || { type: "object", properties: {}, required: [] },
      };
    });
  }

  /**
   * Execute chat completion turn with streaming token & reasoning callbacks
   */
  static async streamTurn({
    model = "gemini-3.5-flash",
    systemPrompt = "You are Sirona, an expert autonomous developer agent.",
    messages = [],
    reasoningEffort = "medium",
    onToken = /** @param {string} _token */ (_token) => {},
    onReasoning = () => {},
    tools = [],
    apiKey = null,
    baseUrl = null,
    providerKind = null,
    nativeChat = false,
    signal = null,
    adapter = null,
    maxTokens = undefined,
  }) {
    if(maxTokens!==undefined && (!Number.isSafeInteger(maxTokens)||maxTokens<1||maxTokens>8192))throw Object.assign(new Error('Invalid bounded output token limit'),{code:'INVALID_ACTIVITY_LIMITS',status:400});
    // Desktop chat uses provider native identity unless an explicit project context is passed.
    if (nativeChat && systemPrompt === "You are Sirona, an expert autonomous developer agent.") systemPrompt = null;
    if (signal?.aborted) {
      const err = new Error("Inference aborted by client");
      err.name = "AbortError";
      throw err;
    }

    const provider = providerKind || this.resolveProvider(model);
    const resolvedApiKey = apiKey || (await this.getApiKey(provider));

    // If no API key configured, fail-fast (no fake mock responses per project requirements)
    if (!resolvedApiKey && provider !== "openai_compatible") {
      /** @type {any} */
      const err = new Error(`No API key configured for provider '${provider}'. Set ${provider.toUpperCase()}_API_KEY in Settings or environment.`);
      err.code = "API_KEY_REQUIRED";
      throw err;
    }

    if (provider === "openai") {
      return await this._streamOpenAI({ apiKey: resolvedApiKey, model, systemPrompt, messages, onToken, tools, signal, maxTokens });
    } else if (provider === "anthropic") {
      return await this._streamAnthropic({ apiKey: resolvedApiKey, model, systemPrompt, messages, onToken, tools, signal, maxTokens });
    } else if (provider === "openai_compatible") {
      const resolvedBaseUrl = baseUrl || (await this.getBaseUrl(provider));
      return await this._streamOpenAICompatible({ apiKey: resolvedApiKey, baseUrl: resolvedBaseUrl, model, systemPrompt, messages, onToken, tools, signal, maxTokens });
    } else {
      const selectedAdapter = adapter || process.env.SIRONA_PROVIDER_ADAPTER;
      const hasTools = (Array.isArray(tools) && tools.length > 0) ||
        (Array.isArray(messages) && messages.some(m => m.role === "tool" || (m.tool_calls && m.tool_calls.length > 0) || (m._rawCandidate?.parts?.some(p => p.functionCall || p.functionResponse))));

      if (selectedAdapter === "vercel_ai_sdk" && !hasTools) {
        return await this._streamAiSdkGoogle({
          apiKey: resolvedApiKey,
          model,
          systemPrompt,
          messages,
          onToken,
          baseUrl,
          signal,
          providerKind: provider,
          tools,
          maxTokens,
        });
      }

      // If tools or tool history are requested, select native Google GenAI adapter for compatibility
      if (selectedAdapter === "vercel_ai_sdk" && hasTools) {
        console.log("[AIService] Unsupported tool options or history detected for AI SDK; selecting native Google GenAI adapter.");
      }

      return await this._streamGoogleGenAI({ apiKey: resolvedApiKey, model, systemPrompt, messages, onToken, onReasoning, reasoningEffort, tools, signal, nativeChat, maxTokens });
    }
  }

  /* ---------------- Vercel AI SDK (Google) ---------------- */
  static async _streamAiSdkGoogle({ apiKey, model, systemPrompt, messages, onToken, baseUrl, signal, providerKind, tools, maxTokens = undefined }) {
    const { AiSdkAdapter } = await import("../dist-workspace/src/providers/aiSdkAdapter.js");
    const sdkAdapter = new AiSdkAdapter();
    return await sdkAdapter.streamTurn({
      apiKey,
      model,
      systemPrompt,
      messages,
      onToken,
      baseUrl,
      signal,
      providerKind,
      tools,
      maxTokens,
    });
  }

  /* ---------------- Google GenAI (ADK) ---------------- */
  static async _streamGoogleGenAI({ apiKey, model, systemPrompt, messages, onToken, onReasoning: _onReasoning, reasoningEffort: _reasoningEffort, tools = [], signal = null, nativeChat = false, maxTokens = undefined }) {
    const ai = new GoogleGenAI({ apiKey });
    let fullContent = "";
    let reasoningContent = "";
    let reportedUsage;
    const toolCalls = [];

    try {
      const formattedHistory = [];
      for (const m of messages) {
        if (m._rawCandidate?.parts) {
          formattedHistory.push({ role: "model", parts: m._rawCandidate.parts });
        } else if (m.role === "tool") {
          const fnPart = {
            functionResponse: {
              name: m.name || m.toolName || "tool",
              response: typeof m.content === "object" ? m.content : { output: m.content },
            },
          };
          const lastMsg = formattedHistory[formattedHistory.length - 1];
          if (lastMsg && lastMsg.role === "user" && lastMsg.parts?.every((p) => p.functionResponse)) {
            lastMsg.parts.push(fnPart);
          } else {
            formattedHistory.push({ role: "user", parts: [fnPart] });
          }
        } else if (m.role === "assistant") {
          if (m.tool_calls && m.tool_calls.length > 0) {
            const parts = [];
            if (m.content) parts.push({ text: m.content });
            for (const tc of m.tool_calls) {
              parts.push({ functionCall: { name: tc.name, args: tc.args || {} } });
            }
            formattedHistory.push({ role: "model", parts });
          } else {
            formattedHistory.push({ role: "model", parts: [{ text: m.content || "" }] });
          }
        } else {
          formattedHistory.push({
            role: "user",
            parts: [{ text: m.content || "" }],
          });
        }
      }

      /** @type {import('@google/genai').GenerateContentConfig} */
      const config = {
        ...(maxTokens===undefined?{}:{maxOutputTokens:maxTokens}),
        ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
        abortSignal: signal || undefined,
      };

      if (tools && tools.length > 0) {
        config.tools = this.formatToolsForGemini(tools);
      }

      let activeModel = nativeChat ? model : ((model === "gemini-2.5-flash" || model === "gemini-3-flash-preview" || model === "gemini-2.5-pro" || model === "gemini-1.5-pro" || model === "gemini-1.5-flash") ? "gemini-3.5-flash" : (model || "gemini-3.5-flash"));

      const maxRetries = maxTokens===undefined ? 4 : 0;
      let attempt = 0;

      while (attempt <= maxRetries) {
        try {
          fullContent = "";
          reasoningContent = "";
          toolCalls.length = 0;
          let rawCandidate = null;

          // Call Gemini using the official @google/genai ADK generateContentStream
          const responseStream = await ai.models.generateContentStream({
            model: activeModel,
            contents: formattedHistory,
            config,
          });

          for await (const chunk of responseStream) {
            if(chunk.usageMetadata)reportedUsage=chunk.usageMetadata;
            if (signal?.aborted) {
              const abortErr = new Error("Inference aborted by client");
              abortErr.name = "AbortError";
              throw abortErr;
            }
            const text = chunk.text;
            if (text) {
              fullContent += text;
              onToken(text);
            }

            if (chunk.functionCalls && chunk.functionCalls.length > 0) {
              for (const fc of chunk.functionCalls) {
                toolCalls.push({
                  id: fc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
                  name: fc.name,
                  args: fc.args || {},
                });
              }
            }

            if (chunk.candidates?.[0]?.content) {
              rawCandidate = chunk.candidates[0].content;
            }
          }

          // If functionCalls weren't captured on stream chunk, check candidate parts
          if (toolCalls.length === 0 && rawCandidate?.parts) {
            for (const part of rawCandidate.parts) {
              if (part.functionCall) {
                toolCalls.push({
                  id: part.functionCall.id || `call_${crypto.randomUUID().slice(0, 8)}`,
                  name: part.functionCall.name,
                  args: part.functionCall.args || {},
                });
              }
            }
          }

          return {
            content: fullContent,
            reasoning: reasoningContent,
            tool_calls: toolCalls,
            rawCandidate,
            tokens: Math.ceil(fullContent.length / 4),
            ...(maxTokens!==undefined&&reportedUsage?{usage:{promptTokens:reportedUsage.promptTokenCount??0,completionTokens:reportedUsage.candidatesTokenCount??0,totalTokens:reportedUsage.totalTokenCount??0}}:{}),
          };
        } catch (callErr) {
          if(signal?.aborted)throw Object.assign(new Error('Inference aborted by client'),{name:'AbortError'});
          const errMsg = callErr?.message || "";
          if (!nativeChat && (callErr?.status === 404 || errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("no longer available")) && activeModel !== "gemini-3.5-flash") {
            console.log(`[AIService] Model ${activeModel} unavailable, retrying with gemini-3.5-flash`);
            activeModel = "gemini-3.5-flash";
            continue;
          }
          const isRateLimit = callErr?.status === 429 || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("Quota exceeded");
          if (isRateLimit && attempt < maxRetries) {
            attempt++;
            let delayMs = 9000;
            const delayMatch = errMsg.match(/retry in ([0-9.]+)s/i) || errMsg.match(/"retryDelay":\s*"([0-9]+)s"/i);
            if (delayMatch && delayMatch[1]) {
              delayMs = Math.ceil(parseFloat(delayMatch[1]) * 1000) + 1500;
            }
            if (errMsg.includes("requests per day") || delayMs > 60000) {
              console.log("[AIService] Daily quota exceeded on provider. Failing fast without retries.");
              throw callErr;
            }
            console.log(`[AIService] Gemini 429 rate limit hit. Waiting ${delayMs}ms before retry ${attempt}/${maxRetries}...`);
            await new Promise((resolve,reject)=>{
              const aborted=()=>{clearTimeout(timer);reject(Object.assign(new Error('Inference aborted by client'),{name:'AbortError'}));};
              const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);resolve();},delayMs);
              signal?.addEventListener('abort',aborted,{once:true});
              if(signal?.aborted)aborted();
            });
            continue;
          }
          throw callErr;
        }
      }
    } catch (err) {
      if(maxTokens===undefined)console.error("Gemini ADK error:", err.message);
      throw err;
    }
  }

  /* ---------------- OpenAI SDK ---------------- */
  static async _streamOpenAI({ apiKey, model, systemPrompt, messages, onToken, tools = [], signal = null, maxTokens = undefined }) {
    const openai = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL });
    let fullContent = "";
    let reportedUsage;

    const chatMessages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool",
            tool_call_id: m.tool_call_id || m.id || "tool_call",
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          };
        }
        if (m.role === "assistant" && m.tool_calls && m.tool_calls.length > 0) {
          return {
            role: "assistant",
            content: m.content || null,
            tool_calls: m.tool_calls.map((tc) => ({
              id: tc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
              type: "function",
              function: {
                name: tc.name,
                arguments: typeof tc.args === "string" ? tc.args : JSON.stringify(tc.args || {}),
              },
            })),
          };
        }
        return {
          role: m.role,
          content: m.content || "",
        };
      }),
    ];

    const openAITools = this.formatToolsForOpenAI(tools);

    const stream = await openai.chat.completions.create(
      {
        model: model || "gpt-4o",
        ...(maxTokens===undefined?{}:{max_completion_tokens:maxTokens}),
        messages: chatMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        stream: true,
        ...(maxTokens===undefined?{}:{stream_options:{include_usage:true}}),
      },
      { signal: signal || undefined }
    );

    const toolCallsMap = new Map();

    for await (const chunk of stream) {
      if(chunk.usage)reportedUsage=chunk.usage;
      if (signal?.aborted) {
        const abortErr = new Error("Inference aborted by client");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;
        onToken(delta.content);
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallsMap.has(idx)) {
            toolCallsMap.set(idx, { id: tc.id || "", name: tc.function?.name || "", arguments: "" });
          }
          const entry = toolCallsMap.get(idx);
          if (tc.id) entry.id = tc.id;
          if (tc.function?.name) entry.name += tc.function.name;
          if (tc.function?.arguments) entry.arguments += tc.function.arguments;
        }
      }
    }

    const toolCalls = Array.from(toolCallsMap.values()).map((tc) => {
      let parsedArgs = {};
      try {
        parsedArgs = JSON.parse(tc.arguments);
      } catch {
        parsedArgs = {};
      }
      return {
        id: tc.id || `call_${crypto.randomUUID().slice(0, 8)}`,
        name: tc.name,
        args: parsedArgs,
      };
    });

    return {
      content: fullContent,
      reasoning: "",
      tool_calls: toolCalls,
      tokens: Math.ceil(fullContent.length / 4),
      ...(maxTokens!==undefined&&reportedUsage?{usage:{promptTokens:reportedUsage.prompt_tokens,completionTokens:reportedUsage.completion_tokens,totalTokens:reportedUsage.total_tokens}}:{}),
    };
  }

  /* ---------------- OpenAI-Compatible (Custom Endpoint) ---------------- */
  static async _streamOpenAICompatible({ apiKey, baseUrl, model, systemPrompt, messages, onToken, tools = [], signal = null, maxTokens = undefined }) {
    const client = new OpenAI({ apiKey, baseURL: baseUrl || undefined });
    let fullContent = "";
    let reportedUsage;

    const chatMessages = [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages.map((m) => {
        if (m.role === "tool") {
          return {
            role: "tool",
            tool_call_id: m.tool_call_id || m.id || "tool_call",
            content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
          };
        }
        return {
          role: m.role,
          content: m.content || "",
        };
      }),
    ];

    const openAITools = this.formatToolsForOpenAI(tools);

    const stream = await client.chat.completions.create(
      {
        model: model || "default",
        ...(maxTokens===undefined?{}:{max_tokens:maxTokens}),
        messages: chatMessages,
        tools: openAITools.length > 0 ? openAITools : undefined,
        stream: true,
        ...(maxTokens===undefined?{}:{stream_options:{include_usage:true}}),
      },
      { signal: signal || undefined }
    );

    for await (const chunk of stream) {
      if(chunk.usage)reportedUsage=chunk.usage;
      if (signal?.aborted) {
        const abortErr = new Error("Inference aborted by client");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        fullContent += delta;
        onToken(delta);
      }
    }

    return {
      content: fullContent,
      reasoning: "",
      tool_calls: [],
      tokens: Math.ceil(fullContent.length / 4),
      ...(maxTokens!==undefined&&reportedUsage?{usage:{promptTokens:reportedUsage.prompt_tokens,completionTokens:reportedUsage.completion_tokens,totalTokens:reportedUsage.total_tokens}}:{}),
    };
  }

  /* ---------------- Anthropic Claude ---------------- */
  static async _streamAnthropic({ apiKey, model, systemPrompt, messages, onToken, tools = [], signal = null, maxTokens = undefined }) {
    const anthropic = new Anthropic({ apiKey });
    let fullContent = "";
    let reportedUsage;
    const toolCalls = [];

    const chatMessages = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.content || "" }));

    const anthropicTools = this.formatToolsForAnthropic(tools);

    const stream = await anthropic.messages.stream(
      {
        model: model || "claude-3-7-sonnet-20250219",
        max_tokens: maxTokens ?? 4096,
        ...(systemPrompt ? { system: systemPrompt } : {}),
        messages: chatMessages,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      },
      { signal: signal || undefined }
    );

    let currentToolCall = null;

    for await (const event of stream) {
      if (signal?.aborted) {
        const abortErr = new Error("Inference aborted by client");
        abortErr.name = "AbortError";
        throw abortErr;
      }
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          const text = event.delta.text;
          fullContent += text;
          onToken(text);
        } else if (event.delta.type === "input_json_delta") {
          if (currentToolCall) {
            currentToolCall.jsonString += event.delta.partial_json;
          }
        }
      } else if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
        currentToolCall = {
          id: event.content_block.id,
          name: event.content_block.name,
          jsonString: "",
        };
      } else if (event.type === "content_block_stop" && currentToolCall) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(currentToolCall.jsonString);
        } catch {
          parsedArgs = {};
        }
        toolCalls.push({
          id: currentToolCall.id,
          name: currentToolCall.name,
          args: parsedArgs,
        });
        currentToolCall = null;
      }
    }

    if(maxTokens!==undefined){const message=await stream.finalMessage();reportedUsage={prompt_tokens:message.usage.input_tokens,completion_tokens:message.usage.output_tokens,total_tokens:message.usage.input_tokens+message.usage.output_tokens};}
    return {
      content: fullContent,
      reasoning: "",
      tool_calls: toolCalls,
      tokens: Math.ceil(fullContent.length / 4),
      ...(maxTokens!==undefined&&reportedUsage?{usage:{promptTokens:reportedUsage.prompt_tokens,completionTokens:reportedUsage.completion_tokens,totalTokens:reportedUsage.total_tokens}}:{}),
    };
  }
}

export default AIService;
