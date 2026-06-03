import { Redis } from "@upstash/redis";
import * as dotenv from "dotenv";

dotenv.config();

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

let redisClient: Redis | null = null;
let isRedisAvailable = false;

// Resilient fallback local in-memory cache
const memoryCache = new Map<string, { value: any; expiry: number }>();

if (url && token) {
  try {
    redisClient = new Redis({
      url,
      token,
    });
    isRedisAvailable = true;
    console.log("Upstash Redis client initialized successfully.");
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis client. Falling back to local memory cache.", err);
  }
} else {
  console.warn("UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Falling back to local memory cache.");
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (isRedisAvailable && redisClient) {
      try {
        const data = await redisClient.get(key);
        if (!data) return null;
        // Upstash Redis SDK auto-parses JSON or returns objects/strings depending on key type
        if (typeof data === "string") {
          try {
            return JSON.parse(data) as T;
          } catch {
            return data as unknown as T;
          }
        }
        return data as T;
      } catch (err) {
        console.error(`Redis GET error for key ${key}:`, err);
        // Fallback to memory
      }
    }

    // Memory cache lookup
    const item = memoryCache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  },

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        const stringified = typeof value === "object" ? JSON.stringify(value) : value;
        await redisClient.set(key, stringified, { ex: ttlSeconds });
        return;
      } catch (err) {
        console.error(`Redis SET error for key ${key}:`, err);
        // Fallback to memory
      }
    }

    // Memory cache set
    const expiry = Date.now() + ttlSeconds * 1000;
    memoryCache.set(key, { value, expiry });
  },

  async delete(key: string): Promise<void> {
    if (isRedisAvailable && redisClient) {
      try {
        await redisClient.del(key);
        return;
      } catch (err) {
        console.error(`Redis DEL error for key ${key}:`, err);
      }
    }
    memoryCache.delete(key);
  }
};
