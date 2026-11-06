export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
}

export interface StreamTurnOptions {
  model: string;
  providerKind: string;
  messages: ChatMessage[];
  apiKey: string;
  baseUrl?: string;
  signal?: AbortSignal;
  onToken?: (token: string) => void;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  nativeChat?: boolean;
  tools?: any[];
}

export interface StreamTurnResult {
  content: string;
  reasoning?: string;
  tool_calls: Array<{
    id: string;
    name: string;
    args: Record<string, unknown>;
  }>;
  tokens: number;
  rawCandidate?: unknown;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface IModelAdapter {
  readonly name: string;
  canHandle(providerKind: string, modelId: string, options?: { tools?: any[]; messages?: ChatMessage[] }): boolean;
  streamTurn(options: StreamTurnOptions): Promise<StreamTurnResult>;
}
