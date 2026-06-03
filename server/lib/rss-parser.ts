import Parser from "rss-parser";
import fetch from "node-fetch";
import { FeedDefinition } from "../feeds.config";
import { getMd5Hash } from "./dedup";

interface RawArticle {
  id: string;
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
  imageUrl?: string;
}

const parser = new Parser({
  customFields: {
    item: [
      ["media:content", "mediaContent"],
      ["enclosure", "enclosure"],
      ["og:image", "ogImage"],
    ],
  },
});

// Strips HTML tags and gets first 200 chars
function cleanSummary(content: string = ""): string {
  if (!content) return "";
  // Strip html and strip inline css/js if any
  const stripped = content
    .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, "")
    .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, "")
    .replace(/<[^>]*>/g, "") // strip html
    .replace(/\s+/g, " ") // normalize whitespace
    .trim();
  return stripped.length > 200 ? stripped.slice(0, 200) + "..." : stripped;
}

// Extracts og:image or media:content URL if present
function extractImageUrl(item: any): string | undefined {
  if (item.ogImage) return item.ogImage;
  if (item.mediaContent && item.mediaContent.$ && item.mediaContent.$.url) {
    return item.mediaContent.$.url;
  }
  if (item.enclosure && item.enclosure.url) {
    return item.enclosure.url;
  }
  return undefined;
}

export async function fetchFeedWithTimeout(
  feedDef: FeedDefinition,
  timeoutMs: number = 8000
): Promise<RawArticle[]> {
  const fetchPromise = (async () => {
    try {
      // Use node-fetch with browser-like headers to bypass 403 restrictions
      const res = await fetch(feedDef.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept": "text/xml, application/xml, text/html, */*",
          "Accept-Language": "en-US,en;q=0.9",
        },
        timeout: timeoutMs - 1000 // leave some time for parsing
      });

      if (!res.ok) {
        throw new Error(`HTTP status ${res.status}`);
      }

      const xmlText = await res.text();
      
      // Parse the XML text
      const parsed = await parser.parseString(xmlText);
      const articles: RawArticle[] = [];

      for (const item of parsed.items) {
        const title = item.title ?? "Untitled announcement";
        const link = item.link ?? item.guid ?? "";
        if (!link) continue;

        const summary = cleanSummary(item.contentSnippet ?? item.content ?? item.summary ?? "");
        const pubDateStr = item.pubDate ?? item.isoDate ?? new Date().toISOString();
        
        let pubDate: string;
        try {
          pubDate = new Date(pubDateStr).toISOString();
        } catch {
          pubDate = new Date().toISOString();
        }

        articles.push({
          id: getMd5Hash(link),
          title,
          summary,
          link,
          pubDate,
          source: feedDef.source,
          category: feedDef.category,
          imageUrl: extractImageUrl(item),
        });
      }

      return articles;
    } catch (err: any) {
      console.warn(`Error crawling feed [${feedDef.source}] from ${feedDef.url}:`, err.message);
      return [];
    }
  })();

  const timeoutPromise = new Promise<RawArticle[]>((resolve) => {
    setTimeout(() => {
      console.warn(`Timeout exceeded (>${timeoutMs}ms) for feed: ${feedDef.source}`);
      resolve([]);
    }, timeoutMs);
  });

  return Promise.race([fetchPromise, timeoutPromise]);
}
