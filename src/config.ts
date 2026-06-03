export const CONFIG = {
  API_BASE: (import.meta.env.VITE_API_BASE_URL as string) ?? "http://localhost:3001",
  POLL_INTERVALS: {
    NEWS_MS: 90_000,
    MARKET_MS: 15_000,
    AI_BRIEF_MS: 180_000,
  },
  MAX_ARTICLES_IN_DOM: 200,
  DEDUP_WINDOW_HOURS: 6,
  SIGNAL_WINDOW_MINUTES: 30,
};

// Year-independent Indian NSE Market Holidays (MM-DD)
export const NSE_HOLIDAYS = [
  "01-26", // Republic Day
  "03-03", // Holi (approx for 2026)
  "04-03", // Good Friday (approx for 2026)
  "04-14", // Ambedkar Jayanti
  "05-01", // Maharashtra Day
  "08-15", // Independence Day
  "09-15", // Ganesh Chaturthi (approx for 2026)
  "10-20", // Dussehra (approx for 2026)
  "11-08", // Diwali Laxmi Pujan (approx for 2026)
  "11-09", // Diwali Balipratipada (approx for 2026)
  "11-24", // Gurunanak Jayanti (approx for 2026)
  "12-25", // Christmas
];

export const SECTOR_INDEX_MAP: Record<string, string> = {
  "IT":      "NIFTY IT",
  "BANK":    "NIFTY BANK",
  "AUTO":    "NIFTY AUTO",
  "FMCG":    "NIFTY FMCG",
  "PHARMA":  "NIFTY PHARMA",
  "INFRA":   "NIFTY INFRA",
  "METAL":   "NIFTY METAL",
  "ENERGY":  "NIFTY ENERGY",
};
