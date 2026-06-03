import * as crypto from "crypto";
import { cache } from "./cache";

const DEDUP_TTL_SECONDS = 6 * 60 * 60; // 6 hours

export function getMd5Hash(text: string): string {
  return crypto.createHash("md5").update(text).digest("hex");
}

export async function isDuplicate(link: string): Promise<boolean> {
  const hash = getMd5Hash(link);
  const cacheKey = `seen:article:${hash}`;
  
  const alreadySeen = await cache.get<boolean>(cacheKey);
  if (alreadySeen) {
    return true;
  }
  
  // Mark as seen for the next 6 hours
  await cache.set(cacheKey, true, DEDUP_TTL_SECONDS);
  return false;
}
