interface FeedHealth {
  source: string;
  status: "healthy" | "failed";
  articleCount?: number;
  error?: string;
  lastChecked: string;
}

const feedHealth = new Map<string, FeedHealth>();

export function markFeedSuccess(source: string, count: number) {
  feedHealth.set(source, {
    source,
    status: "healthy",
    articleCount: count,
    lastChecked: new Date().toISOString(),
  });
}

export function markFeedFailure(source: string, error: string) {
  feedHealth.set(source, {
    source,
    status: "failed",
    error,
    lastChecked: new Date().toISOString(),
  });
}

export function getFeedHealth() {
  return Array.from(feedHealth.values());
}
