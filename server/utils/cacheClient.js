const Redis = require("ioredis");

const memoryCache = new Map();
const DEFAULT_TTL_SECONDS = 300;

let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = new Redis(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    redis.connect().catch(() => {
      redis = null;
    });
  } catch (error) {
    redis = null;
  }
}

const memorySet = (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

const memoryGet = (key) => {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value;
};

const memoryDeleteByPrefix = (prefix) => {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) memoryCache.delete(key);
  }
};

const cacheSet = async (key, value, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  if (redis) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch (error) {
      // fallback to memory cache
    }
  }

  memorySet(key, value, ttlSeconds);
};

const cacheGet = async (key) => {
  if (redis) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      // fallback to memory cache
    }
  }

  return memoryGet(key);
};

const cacheDeleteByPrefix = async (prefix) => {
  if (redis) {
    try {
      const keys = await redis.keys(`${prefix}*`);
      if (keys.length) await redis.del(keys);
    } catch (error) {
      // ignore and fallback
    }
  }

  memoryDeleteByPrefix(prefix);
};

module.exports = {
  cacheSet,
  cacheGet,
  cacheDeleteByPrefix,
};
