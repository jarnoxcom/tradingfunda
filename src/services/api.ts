import { CONFIG } from "../config";
import { MarketSnapshot, Article } from "../types";

export async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
  const url = `${CONFIG.API_BASE}/api/market`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch market data: ${res.statusText}`);
  }
  return await res.json();
}

export async function fetchNewsArticles(category: string = "all"): Promise<Article[]> {
  const url = `${CONFIG.API_BASE}/api/rss?category=${category}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch news articles: ${res.statusText}`);
  }
  return await res.json();
}

export async function generateAiBrief(articles: Article[]): Promise<string[]> {
  const url = `${CONFIG.API_BASE}/api/ai/brief`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ articles }),
  });
  if (!res.ok) {
    throw new Error(`Failed to generate AI brief: ${res.statusText}`);
  }
  const data = await res.json();
  return data.brief || [];
}
