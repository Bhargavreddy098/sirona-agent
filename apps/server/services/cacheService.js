import { redis, isRedisAvailable } from "../config/redis.js";

/* =====================================================================
   Cache Service (Redis with Resilient In-Memory Fallback)
   ===================================================================== */

const memoryCache = new Map();
const memoryExpiry = new Map();

function cleanMemoryCache() {
  const now = Date.now();
  for (const [key, exp] of memoryExpiry.entries()) {
    if (exp <= now) {
      memoryCache.delete(key);
      memoryExpiry.delete(key);
    }
  }
}
setInterval(cleanMemoryCache, 60000).unref();

export const cacheService = {
  async get(key) {
    if (isRedisAvailable()) {
      try {
        const val = await redis.get(key);
        return val ? JSON.parse(val) : null;
      } catch (e) {
        console.warn(`Redis get error on key ${key}:`, e.message);
      }
    }

    // In-memory fallback
    const exp = memoryExpiry.get(key);
    if (exp && exp <= Date.now()) {
      memoryCache.delete(key);
      memoryExpiry.delete(key);
      return null;
    }
    return memoryCache.get(key) || null;
  },

  async set(key, value, ttlSeconds = 300) {
    const serialized = JSON.stringify(value);

    if (isRedisAvailable()) {
      try {
        await redis.set(key, serialized, "EX", ttlSeconds);
        return true;
      } catch (e) {
        console.warn(`Redis set error on key ${key}:`, e.message);
      }
    }

    // In-memory fallback
    memoryCache.set(key, value);
    if (ttlSeconds) {
      memoryExpiry.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  },

  async del(key) {
    if (isRedisAvailable()) {
      try {
        await redis.del(key);
      } catch (e) {
        console.warn(`Redis del error on key ${key}:`, e.message);
      }
    }
    memoryCache.delete(key);
    memoryExpiry.delete(key);
    return true;
  },

  async invalidatePrefix(prefix) {
    if (isRedisAvailable()) {
      try {
        const stream = redis.scanStream({ match: `${prefix}*`, count: 100 });
        stream.on("data", (keys) => {
          if (keys.length) redis.unlink(keys);
        });
      } catch (e) {
        console.warn(`Redis invalidatePrefix error on ${prefix}:`, e.message);
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(prefix)) {
        memoryCache.delete(key);
        memoryExpiry.delete(key);
      }
    }
  },
};

export default cacheService;
