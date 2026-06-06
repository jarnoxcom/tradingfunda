import { Router, Request, Response } from "express";
import { FEEDS } from "../feeds.config";
import { fetchFeedWithTimeout } from "../lib/rss-parser";
import { cache } from "../lib/cache";
import { isMarketOpen } from "../lib/market-hours";
 import { getFeedHealth } from "../lib/feed-health";

export const rssRouter = Router();

const CACHE_KEY = "rss:all";
const CACHE_TTL_SECONDS = 90; // Cache TTL is 90 seconds per spec

interface Article {
  id: string;
  title: string;
  summary: string;
  link: string;
  pubDate: string;
  source: string;
  category: string;
  imageUrl?: string;
}

// Background Crawling Manager
let crawlTimeoutId: NodeJS.Timeout | null = null;
let isCrawlingActive = false;

export async function crawlAllFeeds(): Promise<Article[]> {
  if (isCrawlingActive) {
    console.log("Crawl already in progress. Skipping duplicate crawl trigger.");
    const existing = await cache.get<Article[]>(CACHE_KEY);
    return existing ?? [];
  }

  isCrawlingActive = true;
  console.log("RSS Crawler: Beginning crawl of all 13 sources...");

  try {
    const feedPromises = FEEDS.map((feed) => fetchFeedWithTimeout(feed));
    const results = await Promise.all(feedPromises);

    // Flatten articles
    const allArticles = results.flat();

    // Filter duplicates using MD5 deduplication
    const seenLinks = new Set<string>();
    const uniqueArticles: Article[] = [];

    for (const art of allArticles) {
      if (seenLinks.has(art.link)) continue;

      seenLinks.add(art.link);
      uniqueArticles.push(art);
    }

    // Sort by publication date descending
    uniqueArticles.sort(
      (a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime(),
    );

    // Keep max 500 articles in the server cache to save Redis memory
    const trimmed = uniqueArticles.slice(0, 500);

    // Save to Cache
    await cache.set(CACHE_KEY, trimmed, CACHE_TTL_SECONDS);
    console.log(
      `RSS Crawler: Successfully crawled and saved ${trimmed.length} unique articles.`,
    );

    isCrawlingActive = false;
    return trimmed;
  } catch (err: any) {
    console.error("RSS Crawler error during crawl:", err.message);
    isCrawlingActive = false;
    return [];
  }
}

export function startRssScheduler() {
  if (crawlTimeoutId) {
    clearTimeout(crawlTimeoutId);
  }

  const runScheduler = async () => {
    await crawlAllFeeds();

    // Schedule next run
    const open = isMarketOpen();
    const intervalMs = open ? 90_000 : 300_000; // 90s during hours, 5m outside
    console.log(
      `RSS Scheduler: Next crawl scheduled in ${intervalMs / 1000}s (Market Open: ${open})`,
    );

    crawlTimeoutId = setTimeout(runScheduler, intervalMs);
  };

  // Run immediately on boot in the background
  runScheduler();
}

// REST Endpoint: GET /api/rss
rssRouter.get("/", async (req: Request, res: Response) => {
  try {
    const category = req.query.category as string;

    let articles = await cache.get<Article[]>(CACHE_KEY);

    // Warm cache if empty
    if (!articles || articles.length === 0) {
      console.log("RSS Cache cold. Crawling feeds on-demand...");
      articles = await crawlAllFeeds();
    }

    // Filter by category if requested
    if (category && category !== "all") {
      const filtered = articles.filter(
        (art) => art.category.toLowerCase() === category.toLowerCase(),
      );
      res.json(filtered);
      return;
    }

    res.json(articles);
  } catch (err: any) {
    console.error("Error in GET /api/rss:", err);
    res.status(500).json({ error: "Failed to retrieve news feeds" });
  }
});

rssRouter.get("/health", (req, res) => {
  res.json(getFeedHealth());
});
