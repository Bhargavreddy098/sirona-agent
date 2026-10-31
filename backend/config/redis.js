import { Redis } from "ioredis";

export let redis = null;
let active;
export function isRedisAvailable() { return Boolean(active && !active.stopped && redis?.status === "ready"); }

/** Optional cache only. No constructor, connection or reconnect loop on import.
 * @param {import('../foundation/contracts.js').CacheConfig} config
 * @param {import('../foundation/contracts.js').EventLogger} logger
 * @param {import('../foundation/contracts.js').CacheConstructor} RedisClient
 */
export function createRedisOwner(config, logger, RedisClient = Redis) {
  const options = { lazyConnect: true, enableOfflineQueue: false, maxRetriesPerRequest: 0,
    retryStrategy: () => null, reconnectOnError: () => false, connectTimeout: config.timeoutMs };
  const client = config.url ? new RedisClient(config.url, options) : new RedisClient({ ...config, ...options });
  let closing;
  const owner = { client, stopped: false,
    async initialize() { await client.connect(); if (client.status !== "ready") throw new Error("Optional cache unavailable"); },
    close() {
      if (!closing) {
        owner.stopped = true;
        closing = Promise.resolve().then(() => client.disconnect()).finally(() => {
          if (active === owner) { active = undefined; redis = null; }
        });
      }
      return closing;
    },
  };
  client.on("error", () => logger.event("dependency.unavailable", { category: "cache", code: "RESOURCE_FAILED" }));
  return owner;
}
export function activateRedisOwner(owner) {
  if (active) throw new Error("Cache owner already exists");
  active = owner; redis = owner.client;
}
export { redis as default };
