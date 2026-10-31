import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";
import { redis, isRedisAvailable } from "../config/redis.js";
import { rateLimitResponse } from "./problem.js";

/** Application-owned volatile request quota. It borrows Redis; never closes the shared client. */
export function createRateLimiterOwner(config) {
  const memory = !isRedisAvailable();
  const limiter = memory ? new RateLimiterMemory(config) : new RateLimiterRedis({ ...config, storeClient: redis, keyPrefix: "rl_sirona" });
  const keys = new Set();
  let stopped = false;
  let closing;
  return {
    async middleware(req, res, next) {
      if (stopped) return rateLimitResponse(req, res, 1);
      if (req.path === "/health" || req.path === "/api/status") return next();
      const key = req.user?.id || req.ip || "127.0.0.1";
      if (memory) keys.add(key);
      try { await limiter.consume(key); return next(); }
      catch (error) {
        const delay = Number.isFinite(error.msBeforeNext) ? Math.max(1, Math.ceil(error.msBeforeNext / 1000)) : 1;
        return rateLimitResponse(req, res, delay);
      }
    },
    close() {
      if (!closing) {
        stopped = true;
        closing = Promise.all([...keys].map(key => limiter.delete(key))).then(() => { keys.clear(); });
      }
      return closing;
    },
  };
}
