import type { RedisOptions } from "ioredis";

/** Only Stage 01 metadata actually installed by the HTTP boundary. */
declare module "http" {
  interface IncomingMessage { requestId?: string; }
}
export type EventFields = {
  category?: string; code?: string; method?: string; status?: number; requestId?: string;
} & Record<string, unknown>;
export interface EventLogger { event(event: string, fields?: EventFields): void; }
export type LifecycleError = Error & { code: string; logged?: boolean };
export interface CacheClient {
  status: string;
  connect(): Promise<unknown>;
  disconnect(): void;
  on(event: string, listener: () => void): unknown;
}
export type CacheConstructor = new (config: string | RedisOptions, options?: RedisOptions) => CacheClient;
export type CacheConfig = RedisOptions & { url?: string; timeoutMs: number };
export type DatabaseConfig = {
  max: number; idleTimeoutMillis: number; connectionTimeoutMillis: number; query_timeout: number;
  ssl: false | Readonly<{ rejectUnauthorized: true }>;
  connectionString?: string; host?: string; port?: number; database?: string; user?: string; password?: string;
};
export type Middleware = (req: unknown, res: unknown, next: (error?: unknown) => void) => unknown;
export type AppOptions = {
  healthController: ReturnType<typeof import("../controllers/healthController.js").createHealthController>;
  apiRoutes: Middleware; auditContext: Middleware; rateLimiter: Middleware;
  allowedOrigins: readonly string[];
  logError?: (record: Record<string, unknown>) => unknown;
  httpLogger?: Middleware;
  accepting?: () => boolean;
  admission?: Middleware;
};
