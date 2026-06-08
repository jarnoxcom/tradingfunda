import { Router, Request, Response } from "express";
import { nseFetch } from "../lib/cookie-jar";
import { cache } from "../lib/cache";
import { isMarketOpen } from "../lib/market-hours";

export const marketRouter = Router();

const CACHE_KEY_SNAPSHOT = "market:snapshot";
const CACHE_TTL_INDICES = 15; // 15s cache per spec
const CACHE_TTL_MOVERS = 30; // 30s cache
const CACHE_TTL_FIIDII = 300; // 300s cache

interface IndexData {
  name: string;
  last: number;
  change: number;
  pChange: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

interface Mover {
  symbol: string;
  company: string;
  ltp: number;
  pChange: number;
  volume: number;
}

interface MarketSnapshot {
  indices: IndexData[];
  topGainers: Mover[];
  topLosers: Mover[];
  advances: number;
  declines: number;
  unchanged: number;
  vix: number;
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN";
  lastUpdated: string;
  fiiNet?: number;
  diiNet?: number;
}

// Resilient Offline Mock Data (as fallback for off-market hours or NSE downtime)
const MOCK_SNAPSHOT: MarketSnapshot = {
  indices: [
    { name: "NIFTY 50", last: 24532.10, change: 98.50, pChange: 0.40, open: 24450.00, high: 24580.00, low: 24420.00, previousClose: 24433.60 },
    { name: "SENSEX", last: 80650.30, change: 320.10, pChange: 0.40, open: 80400.00, high: 80780.00, low: 80350.00, previousClose: 80330.20 },
    { name: "NIFTY BANK", last: 52120.40, change: -415.80, pChange: -0.79, open: 52600.00, high: 52700.00, low: 52020.00, previousClose: 52536.20 },
    { name: "INDIA VIX", last: 13.45, change: 0.35, pChange: 2.67, open: 13.10, high: 13.90, low: 12.80, previousClose: 13.10 },
    { name: "NIFTY IT", last: 38450.25, change: 1150.40, pChange: 3.08, open: 37350.00, high: 38600.00, low: 37300.00, previousClose: 37299.85 },
    { name: "NIFTY AUTO", last: 25420.10, change: -125.30, pChange: -0.49, open: 25550.00, high: 25620.00, low: 25380.00, previousClose: 25545.40 },
    { name: "NIFTY FMCG", last: 57120.80, change: 180.20, pChange: 0.32, open: 56980.00, high: 57250.00, low: 56850.00, previousClose: 56940.60 },
    { name: "NIFTY PHARMA", last: 20150.40, change: -95.60, pChange: -0.47, open: 20250.00, high: 20300.00, low: 20110.00, previousClose: 20246.00 },
    { name: "NIFTY INFRA", last: 8520.15, change: 42.50, pChange: 0.50, open: 8480.00, high: 8540.00, low: 8460.00, previousClose: 8477.65 },
    { name: "NIFTY METAL", last: 9150.30, change: -22.40, pChange: -0.24, open: 9180.00, high: 9220.00, low: 9120.00, previousClose: 9172.70 },
    { name: "NIFTY ENERGY", last: 40120.60, change: 310.80, pChange: 0.78, open: 39850.00, high: 40250.00, low: 39750.00, previousClose: 39809.80 },
  ],
  topGainers: [
    { symbol: "TCS", company: "Tata Consultancy Services Ltd", ltp: 4120.50, pChange: 4.12, volume: 1540000 },
    { symbol: "INFY", company: "Infosys Ltd", ltp: 1850.25, pChange: 3.52, volume: 2840000 },
    { symbol: "RELIANCE", company: "Reliance Industries Ltd", ltp: 2950.40, pChange: 1.45, volume: 4210000 },
    { symbol: "WIPRO", company: "Wipro Ltd", ltp: 520.30, pChange: 1.34, volume: 1980000 },
    { symbol: "BHARTIARTL", company: "Bharti Airtel Ltd", ltp: 1420.15, pChange: 1.10, volume: 1250000 }
  ],
  topLosers: [
    { symbol: "HDFCBANK", company: "HDFC Bank Ltd", ltp: 1610.20, pChange: -1.82, volume: 5410000 },
    { symbol: "ICICIBANK", company: "ICICI Bank Ltd", ltp: 1120.40, pChange: -1.25, volume: 3820000 },
    { symbol: "TATAMOTORS", company: "Tata Motors Ltd", ltp: 940.10, pChange: -1.15, volume: 2210000 },
    { symbol: "SBIN", company: "State Bank of India", ltp: 785.40, pChange: -0.90, volume: 4120000 },
    { symbol: "AXISBANK", company: "Axis Bank Ltd", ltp: 1190.15, pChange: -0.75, volume: 1840000 }
  ],
  advances: 28,
  declines: 20,
  unchanged: 2,
  vix: 13.45,
  marketStatus: "CLOSED",
  lastUpdated: new Date().toISOString(),
  fiiNet: -620.50,
  diiNet: 940.20
};

// Scheduler config
let marketTimeoutId: NodeJS.Timeout | null = null;
let isFetchActive = false;

export async function fetchNseSnapshot(): Promise<MarketSnapshot> {
  if (isFetchActive) {
    const existing = await cache.get<MarketSnapshot>(CACHE_KEY_SNAPSHOT);
    return existing ?? MOCK_SNAPSHOT;
  }

  isFetchActive = true;
  console.log("Market Poller: Querying NSE public endpoints...");

  try {
    // 1. Fetch Indices in parallel
    const indicesData = await nseFetch("https://www.nseindia.com/api/allIndices");

    const nifty50Data = indicesData.data?.find(
      (idx: any) => idx.index === "NIFTY 50"
    );

    const advances = Number(nifty50Data?.advances || 0);
    const declines = Number(nifty50Data?.declines || 0);
    const unchanged = Number(nifty50Data?.unchanged || 0);

    const indices: IndexData[] = (indicesData.data || []).map((idx: any) => ({
      name: idx.index,
      last: idx.last,
      change: idx.variation,
      pChange: idx.percentChange,
      open: idx.open,
      high: idx.high,
      low: idx.low,
      previousClose: idx.previousClose,
    }));

    // Find India VIX
    const vixIdx = indices.find(idx => idx.name === "INDIA VIX");
    const vix = vixIdx ? vixIdx.last : 13.5;

    // 2. Fetch Gainers/Losers
    const moversData = await nseFetch("https://www.nseindia.com/api/live-analysis-variations");

    console.log("MOVERS DATA:", moversData);
    
    // Parse movers safely supporting various NSE API shapes
    const topGainers: Mover[] = (moversData.gainers?.data || []).slice(0, 5).map((m: any) => ({
      symbol: m.symbol,
      company: m.companyName || m.symbol,
      ltp: parseFloat(m.ltp) || parseFloat(m.lastPrice) || 0,
      pChange: parseFloat(m.pChange) || parseFloat(m.pchange) || 0,
      volume: parseInt(m.volume) || 0,
    }));

    const topLosers: Mover[] = (moversData.losers?.data || []).slice(0, 5).map((m: any) => ({
      symbol: m.symbol,
      company: m.companyName || m.symbol,
      ltp: parseFloat(m.ltp) || parseFloat(m.lastPrice) || 0,
      pChange: parseFloat(m.pChange) || parseFloat(m.pchange) || 0,
      volume: parseInt(m.volume) || 0,
    }));

    // 3. Fetch Advances / Declines
    // const nifty50Data = (indicesData.data || []).find(
    //   (idx: any) => idx.index === "NIFTY 50"
    // );

    // const advances = Number(nifty50Data?.advances || 0);
    // const declines = Number(nifty50Data?.declines || 0);
    // const unchanged = Number(nifty50Data?.unchanged || 0);

    // 4. Fetch FII / DII net values
    let fiiNet = -620.50;
    let diiNet = 940.20;
    try {
      const fiiDiiData = await nseFetch("https://www.nseindia.com/api/fiidiiTradeReact");
      const fiiItem = fiiDiiData.find((d: any) => d.category === "FII" || d.category?.includes("FII"));
      const diiItem = fiiDiiData.find((d: any) => d.category === "DII" || d.category?.includes("DII"));
      if (fiiItem) fiiNet = parseFloat(fiiItem.netValue || fiiItem.net || "0");
      if (diiItem) diiNet = parseFloat(diiItem.netValue || diiItem.net || "0");
    } catch {
      console.warn("FII/DII fetch failed. Using cached daily defaults.");
    }

    // Determine status
    const open = isMarketOpen();
    const marketStatus = open ? "OPEN" : "CLOSED";

    const snapshot: MarketSnapshot = {
      indices,
      topGainers,
      topLosers,
      advances,
      declines,
      unchanged,
      vix,
      marketStatus,
      lastUpdated: new Date().toISOString(),
      fiiNet,
      diiNet,
    };

    // Save to Cache
    await cache.set(CACHE_KEY_SNAPSHOT, snapshot, CACHE_TTL_INDICES);
    console.log("Market Poller: Successfully cached real NSE snapshot.");
    
    isFetchActive = false;
    return snapshot;
  } catch (err: any) {
    console.warn("Market Poller: Failed to fetch live data from NSE. Falling back to mock values.", err.message);
    
    // In case of error, update mock timestamp and return mock
    const fallback = { ...MOCK_SNAPSHOT, lastUpdated: new Date().toISOString() };
    
    // Cache the fallback temporarily so we don't bombard NSE
    await cache.set(CACHE_KEY_SNAPSHOT, fallback, CACHE_TTL_INDICES);
    
    isFetchActive = false;
    return fallback;
  }
}

export function startMarketScheduler() {
  if (marketTimeoutId) {
    clearTimeout(marketTimeoutId);
  }

  const runScheduler = async () => {
    await fetchNseSnapshot();
    
    // Dynamic polling based on schedule
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const istDate = new Date(istString);
    
    const hours = istDate.getHours();
    const minutes = istDate.getMinutes();
    const timeInMin = hours * 60 + minutes;
    const day = istDate.getDay();

    let intervalMs = 300_000; // 5 min default

    const isWeekend = day === 0 || day === 6;
    
    if (!isWeekend) {
      if (timeInMin >= 555 && timeInMin <= 935) {
        intervalMs = 15_000; // Market Open: 15 seconds
      } else if (timeInMin >= 540 && timeInMin < 555) {
        intervalMs = 30_000; // Pre-market (09:00 - 09:15): 30 seconds
      }
    }

    console.log(`Market Scheduler: Next polling run in ${intervalMs / 1000}s`);
    marketTimeoutId = setTimeout(runScheduler, intervalMs);
  };

  runScheduler();
}

// REST Endpoint: GET /api/market
marketRouter.get("/", async (req: Request, res: Response) => {
  try {
    let snapshot = await cache.get<MarketSnapshot>(CACHE_KEY_SNAPSHOT);
    if (!snapshot) {
      snapshot = await fetchNseSnapshot();
    }
    res.json(snapshot);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to retrieve market snapshot data" });
  }
});
