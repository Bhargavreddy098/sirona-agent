import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, type ModelMessage } from 'ai';
import type { IModelAdapter, StreamTurnOptions, StreamTurnResult } from './modelAdapter.js';

export class AiSdkAdapter implements IModelAdapter {
  public readonly name = 'vercel_ai_sdk';

  /**
   * P4 Scope: Incremental support starting with Google connections.
   * Returns false if unsupported options (such as tools or tool messages in history) are requested.
   */
  public canHandle(providerKind: string, _modelId: string, options?: { tools?: any[]; messages?: any[] }): boolean {
    const kind = (providerKind || '').toLowerCase();
    const isGoogle = kind === 'google' || kind === 'gemini';
    if (!isGoogle) return false;
    if (options?.tools && options.tools.length > 0) return false;
    if (options?.messages && options.messages.some(m => m.role === 'tool' || (m.tool_calls && m.tool_calls.length > 0))) return false;
    return true;
  }

  /**
   * Walks the error `cause` chain so transport failures wrapped by the AI SDK
   * (for example "Failed to process successful response" -> cause "terminated")
   * can still be classified without depending on the outer message alone.
   */
  private collectErrorSignals(err: any): { messages: string[]; codes: string[] } {
    const messages: string[] = [];
    const codes: string[] = [];
    let current = err;
    let depth = 0;
    while (current && depth < 8) {
      if (typeof current.message === 'string') messages.push(current.message);
      if (typeof current.code === 'string') codes.push(current.code);
      current = current.cause;
      depth += 1;
    }
    return { messages, codes };
  }

  private createAbortOrTimeoutError(signal?: AbortSignal, err?: any): Error {
    const isTimeout =
      signal?.reason?.name === 'TimeoutError' ||
      err?.name === 'TimeoutError' ||
      (typeof signal?.reason?.message === 'string' && (signal.reason.message.toLowerCase().includes('timeout') || signal.reason.message.toLowerCase().includes('deadline'))) ||
      (typeof err?.message === 'string' && (err.message.toLowerCase().includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.toLowerCase().includes('deadline')));
    const abortErr = new Error(isTimeout ? 'Inference request timed out' : 'Inference aborted by client');
    abortErr.name = isTimeout ? 'TimeoutError' : 'AbortError';
    (abortErr as any).status = isTimeout ? 504 : 499;
    (abortErr as any).code = isTimeout ? 'INFERENCE_TIMEOUT' : 'TURN_CANCELLED';
    return abortErr;
  }

  /**
   * Execute streaming turn via Vercel AI SDK with exact model ID and native error handling.
   */
  public async streamTurn(options: StreamTurnOptions): Promise<StreamTurnResult> {
    if (!options.apiKey) {
      const err = new Error('API key is required for AI SDK provider dispatch');
      (err as any).status = 401;
      (err as any).code = 'AUTHENTICATION_REQUIRED';
      throw err;
    }

    if ((options.tools && options.tools.length > 0) || options.messages?.some(m => m.role === 'tool' || (m.tool_calls && m.tool_calls.length > 0))) {
      const unsupportedErr = new Error('AiSdkAdapter does not support tools or tool message history; select native adapter');
      (unsupportedErr as any).status = 400;
      (unsupportedErr as any).code = 'UNSUPPORTED_REQUEST';
      throw unsupportedErr;
    }

    if (options.signal?.aborted) {
      throw this.createAbortOrTimeoutError(options.signal);
    }

    const google = createGoogleGenerativeAI({
      apiKey: options.apiKey,
      baseURL: options.baseUrl,
    });

    // Exact model identifier preserved without mutation
    const model = google(options.model);

    // Format chat messages into ModelMessage representation
    const formattedMessages: ModelMessage[] = [];
    let systemInstruction = options.systemPrompt || '';

    for (const msg of options.messages) {
      if (msg.role === 'system') {
        if (!systemInstruction) {
          systemInstruction = msg.content;
        } else {
          systemInstruction += `\n\n${msg.content}`;
        }
      } else if (msg.role === 'user') {
        formattedMessages.push({
          role: 'user',
          content: msg.content,
        });
      } else if (msg.role === 'assistant') {
        formattedMessages.push({
          role: 'assistant',
          content: msg.content,
        });
      }
    }

    let fullContent = '';
    let capturedStreamError: any = null;

    try {
      const result = streamText({
        model,
        system: systemInstruction || undefined,
        messages: formattedMessages,
        abortSignal: options.signal,
        temperature: options.temperature,
        maxOutputTokens: options.maxTokens,
        onError({ error }) {
          capturedStreamError = error;
        },
      });

      for await (const textDelta of result.textStream) {
        if (options.signal?.aborted) {
          throw this.createAbortOrTimeoutError(options.signal);
        }

        if (textDelta) {
          fullContent += textDelta;
          options.onToken?.(textDelta);
          if (options.signal?.aborted) {
            throw this.createAbortOrTimeoutError(options.signal);
          }
        }
      }

      if (options.signal?.aborted) {
        throw this.createAbortOrTimeoutError(options.signal);
      }

      if (capturedStreamError) {
        throw capturedStreamError;
      }

      // Await final usage accounting
      let promptTokens = Math.ceil(
        (systemInstruction.length + formattedMessages.reduce((acc, m) => acc + (typeof m.content === 'string' ? m.content.length : 0), 0)) / 4
      );
      let completionTokens = Math.max(1, Math.ceil(fullContent.length / 4));
      let totalTokens = promptTokens + completionTokens;

      try {
        const reportedUsage = await result.usage;
        if (reportedUsage) {
          promptTokens = reportedUsage.inputTokens || promptTokens;
          completionTokens = reportedUsage.outputTokens || completionTokens;
          totalTokens = reportedUsage.totalTokens || (promptTokens + completionTokens);
        }
      } catch {
        // Fall back to estimated tokens if usage promise was interrupted
      }

      return {
        content: fullContent,
        tool_calls: [],
        tokens: completionTokens,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
        },
      };
    } catch (err: any) {
      if (options.signal?.aborted || err?.name === 'AbortError' || err?.name === 'TimeoutError') {
        throw this.createAbortOrTimeoutError(options.signal, err);
      }

      // Translate AI SDK / Google errors to standard Sirona provider error codes
      const msg = err?.message || '';
      const status = err?.statusCode || err?.status || 500;
      const signals = this.collectErrorSignals(err);
      const signalText = signals.messages.join(' | ').toLowerCase();
      const signalCodes = signals.codes.map((code) => code.toUpperCase());

      if (status === 401 || msg.includes('API_KEY_INVALID') || msg.includes('API key not valid')) {
        const authErr = new Error('Provider authentication failed (HTTP 401). Update the connection in Model Providers.');
        (authErr as any).status = 401;
        (authErr as any).code = 'INVALID_CREDENTIALS';
        throw authErr;
      }

      if (status === 429 || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded') || msg.toLowerCase().includes('rate limit')) {
        const rateErr = new Error('The model provider rate limit was reached (HTTP 429). Wait for its reset or choose another model.');
        (rateErr as any).status = 429;
        (rateErr as any).code = 'RATE_LIMIT_EXCEEDED';
        throw rateErr;
      }

      if (status === 404 || msg.includes('not found') || msg.includes('models/')) {
        const notFoundErr = new Error(`The requested model '${options.model}' was not found on provider (HTTP 404).`);
        (notFoundErr as any).status = 404;
        (notFoundErr as any).code = 'MODEL_NOT_FOUND';
        throw notFoundErr;
      }

      // Transport breaks surface either directly or wrapped by the AI SDK when the
      // response body ends unexpectedly while the SSE stream is still being parsed.
      const interruptionSignals = [
        'econnreset',
        'socket hang up',
        'premature close',
        'stream interrupted',
        'other side closed',
        'terminated',
        'und_err_socket',
        'failed to process successful response',
        'fetch failed',
      ];
      if (interruptionSignals.some((needle) => signalText.includes(needle)) || signalCodes.includes('UND_ERR_SOCKET')) {
        const streamErr = new Error('Upstream model stream was interrupted unexpectedly before completion');
        (streamErr as any).status = 502;
        (streamErr as any).code = 'STREAM_INTERRUPTED';
        throw streamErr;
      }

      throw err;
    }
  }
}
