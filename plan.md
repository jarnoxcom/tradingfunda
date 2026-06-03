# India Market Monitor — Agent Build Plan

> **Objective:** Build a real-time Indian stock market intelligence dashboard that aggregates public news feeds, live market data, and regulatory announcements into a unified situational awareness interface — inspired by World Monitor (worldmonitor.app) but laser-focused on NSE/BSE, Indian macro signals, and sector intelligence.
>
> **Tech Stack:** Vanilla TypeScript + Vite (frontend) · Node.js + Express (backend relay server) · Redis via Upstash (cache) · Claude API (AI synthesis) · Vercel (frontend deploy) · Railway (backend deploy)
>
> **Do NOT use React.** World Monitor itself uses Vanilla TypeScript — direct DOM manipulation is required for the volume of real-time updates this dashboard produces.

---

## Repository Structure

```
india-market-monitor/
├── index.html                  # Main dashboard entry
├── src/
│   ├── main.ts                 # App bootstrap, layout mount
│   ├── types.ts                # All shared TypeScript interfaces
│   ├── config.ts               # Feed URLs, API endpoints, constants
│   ├── state.ts                # Central in-memory state store
│   ├── components/
│   │   ├── navbar.ts           # Top bar: index tickers + market status
│   │   ├── sidebar.ts          # Left panel: category filters
│   │   ├── news-feed.ts        # Main news column
│   │   ├── market-panel.ts     # Right panel: movers, VIX, FII/DII
│   │   ├── sector-heatmap.ts   # Sector grid with % change colors
│   │   ├── signal-bar.ts       # Convergence signal alerts
│   │   └── ai-brief.ts         # AI-synthesized market brief widget
│   ├── services/
│   │   ├── rss.ts              # RSS fetch + parse + deduplicate
│   │   ├── market-data.ts      # NSE/BSE price polling
│   │   ├── ai.ts               # Claude API integration
│   │   └── signals.ts          # Signal convergence engine
│   └── utils/
│       ├── dom.ts              # DOM helpers
│       ├── format.ts           # Number/date formatters
│       └── storage.ts          # LocalStorage for user prefs
├── server/
│   ├── index.ts                # Express server entry
│   ├── routes/
│   │   ├── rss.ts              # RSS proxy + cache endpoint
│   │   ├── market.ts           # Market data proxy endpoint
│   │   └── ai.ts               # AI brief generation endpoint
│   ├── lib/
│   │   ├── rss-parser.ts       # Feed parsing logic
│   │   ├── cache.ts            # Redis (Upstash) wrapper
│   │   └── dedup.ts            # Article deduplication by URL hash
│   └── feeds.config.ts         # All RSS feed definitions
├── public/
│   └── favicon.ico
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.example
```

---

## Phase 1 — Project Scaffold & Dashboard Shell

### 1.1 Init Project

```bash
npm create vite@latest india-market-monitor -- --template vanilla-ts
cd india-market-monitor
npm install
npm install -D typescript vite
```

### 1.2 Install Dependencies

**Frontend:**
```bash
npm install chart.js            # Candlestick/line charts
npm install lightweight-charts  # TradingView lightweight charts
```

**Backend:**
```bash
cd server
npm install express cors rss-parser node-fetch @upstash/redis dotenv
npm install -D @types/express @types/cors typescript ts-node nodemon
```

### 1.3 Build the Dashboard Layout (index.html + main.ts)

The layout has exactly **4 zones**. Build all 4 as static HTML first, then wire data:

```
┌──────────────────────────────────────────────────────────────────┐
│  NAVBAR: [NIFTY 50 ▲ 24,532 +0.4%] [SENSEX] [BANKNIFTY] [VIX]  │
│          [NSE: OPEN] [08:42 IST]                                  │
├──────────┬───────────────────────────────────┬────────────────────┤
│ SIDEBAR  │  NEWS FEED (main column)           │  MARKET PANEL      │
│          │                                    │                    │
│ [ALL]    │  ┌─────────────────────────────┐  │  Top Gainers       │
│ [NSE]    │  │ AI BRIEF (top of feed)      │  │  Top Losers        │
│ [BSE]    │  └─────────────────────────────┘  │  FII/DII Activity  │
│ [RBI]    │                                    │  52W High/Low      │
│ [SEBI]   │  [Article Card]                   │  Circuit Breakers  │
│ [MACRO]  │  [Article Card]                   │                    │
│ [SECTOR] │  [Article Card]                   │  ─────────────     │
│ [GLOBAL] │  ...                               │  SECTOR HEATMAP    │
│          │                                    │  IT  BANK  AUTO    │
│          │                                    │  FMCG INFRA PHARMA │
└──────────┴───────────────────────────────────┴────────────────────┘
│  SIGNAL BAR: [⚡ Banking Stress: RBI + FII sell + BankNifty -1.2%]│
└──────────────────────────────────────────────────────────────────┘
```

**CSS requirements:**
- Dark theme only. Background: `#0a0e1a`. Surface cards: `#111827`. Accent: `#00d4aa` (green) and `#ef4444` (red).
- Font: `Inter` from Google Fonts.
- Layout: CSS Grid. No flexbox hacks for major layout — use `grid-template-areas`.
- Scrollable news feed column with custom thin scrollbar.
- Navbar must be `position: sticky; top: 0; z-index: 100`.
- Signal bar must be `position: sticky; bottom: 0`.

---

## Phase 2 — RSS Feed Aggregation (Backend)

### 2.1 Feed Configuration (`server/feeds.config.ts`)

Define every feed with its category and source name. Minimum required feeds:

```typescript
export const FEEDS = [
  // Market News
  { url: "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms", category: "market", source: "ET Markets" },
  { url: "https://www.moneycontrol.com/rss/MCtopnews.xml", category: "market", source: "Moneycontrol" },
  { url: "https://www.business-standard.com/rss/markets-106.rss", category: "market", source: "Business Standard" },
  { url: "https://www.livemint.com/rss/markets", category: "market", source: "LiveMint" },
  { url: "https://feeds.feedburner.com/ndtvprofit-latest", category: "market", source: "NDTV Profit" },

  // Regulatory
  { url: "https://www.sebi.gov.in/sebiweb/home/HomeAction.do?doListing=yes&sid=1&ssid=3&smid=0&rss=yes", category: "sebi", source: "SEBI" },
  { url: "https://rbi.org.in/Scripts/RSSFeedPage.aspx", category: "rbi", source: "RBI" },
  { url: "https://www.nseindia.com/homepage/liveFeed/rss/nse_press_releases_rss.xml", category: "nse", source: "NSE" },

  // Economy / Macro
  { url: "https://economictimes.indiatimes.com/economy/rssfeeds/1373380680.cms", category: "macro", source: "ET Economy" },
  { url: "https://www.business-standard.com/rss/economy-policy-102.rss", category: "macro", source: "BS Economy" },

  // Corporate / Earnings
  { url: "https://economictimes.indiatimes.com/markets/stocks/earnings/rssfeeds/2143429.cms", category: "earnings", source: "ET Earnings" },
  { url: "https://www.moneycontrol.com/rss/results.xml", category: "earnings", source: "MC Results" },

  // Global (macro context)
  { url: "https://feeds.reuters.com/reuters/businessNews", category: "global", source: "Reuters" },
  { url: "https://www.ft.com/rss/home/uk", category: "global", source: "FT" },
];
```

### 2.2 RSS Proxy Endpoint (`server/routes/rss.ts`)

- `GET /api/rss` — returns all articles, merged, sorted by `pubDate` descending
- `GET /api/rss?category=market` — filtered by category
- Poll interval: **90 seconds** for market feeds during market hours (09:15–15:30 IST), **5 minutes** outside
- Cache all responses in Redis with key `rss:all` and TTL = 90s
- Deduplication: hash `article.link` with MD5, reject if seen in last 6 hours
- Each article object returned:

```typescript
interface Article {
  id: string;           // MD5 of link
  title: string;
  summary: string;      // First 200 chars of content, HTML stripped
  link: string;
  pubDate: string;      // ISO 8601
  source: string;       // "ET Markets"
  category: string;     // "market" | "sebi" | "rbi" | "macro" | "earnings" | "global"
  imageUrl?: string;    // og:image if present
}
```

### 2.3 CORS & Rate Limiting

- The NSE and BSE websites block direct browser requests. **All market data and RSS calls must go through your backend relay.** Never call NSE/BSE endpoints from the browser directly.
- Add `express-rate-limit`: 100 req/min per IP on all `/api/*` routes.

---

## Phase 3 — Live Market Data (Backend)

### 3.1 NSE Public Endpoints

NSE has undocumented but reliable public JSON endpoints. Call them from the server only (they block requests without a browser-like User-Agent and Referer header).

```typescript
// Required headers for all NSE requests
const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Referer": "https://www.nseindia.com",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
};

// Endpoints to poll
const NSE_ENDPOINTS = {
  indices: "https://www.nseindia.com/api/allIndices",              // All indices incl Nifty 50, BankNifty, VIX
  gainersLosers: "https://www.nseindia.com/api/live-analysis-variations", // Top movers
  fiiDii: "https://www.nseindia.com/api/fiidiiTradeReact",         // FII/DII daily data
  advances: "https://www.nseindia.com/api/equity-stockIndices?index=NIFTY%2050", // Nifty 50 constituents
};
```

**Important:** NSE requires a session cookie. Before any data call, first hit `https://www.nseindia.com` to get cookies, then reuse the cookie jar for subsequent API calls. Use a `CookieJar` with `node-fetch` or `axios` with `jar` support (`axios-cookiejar-support`).

### 3.2 Market Data Polling Schedule

```
Market Hours (09:15–15:35 IST):    Poll indices every 15 seconds
Pre-market (09:00–09:15 IST):      Poll every 30 seconds
After-hours / Weekend:             Poll every 5 minutes (for global cues)
```

Cache in Redis:
- `market:indices` TTL 15s
- `market:movers` TTL 30s
- `market:fiidii` TTL 300s (changes once/day)

### 3.3 Market Data API Response Shape

```typescript
interface IndexData {
  name: string;         // "NIFTY 50"
  last: number;         // 24532.10
  change: number;       // 98.50
  pChange: number;      // 0.40  (percent)
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

interface Mover {
  symbol: string;       // "RELIANCE"
  company: string;      // "Reliance Industries Ltd"
  ltp: number;          // Last traded price
  pChange: number;      // % change
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
}
```

---

## Phase 4 — Frontend Data Wiring

### 4.1 State Store (`src/state.ts`)

Single source of truth. No framework — just a plain object with subscriber callbacks:

```typescript
interface AppState {
  articles: Article[];
  market: MarketSnapshot | null;
  activeCategory: string;        // "all" | "market" | "sebi" | ...
  signals: Signal[];
  aiBrief: string;
  lastFetch: number;
}

// Minimal pub-sub
const subscribers: Array<(state: AppState) => void> = [];
export function subscribe(fn: (s: AppState) => void) { subscribers.push(fn); }
export function setState(patch: Partial<AppState>) {
  Object.assign(state, patch);
  subscribers.forEach(fn => fn(state));
}
```

### 4.2 Navbar Component (`src/components/navbar.ts`)

- Renders index tickers as `<div class="ticker">` elements
- Updates DOM in-place every 15 seconds using `requestAnimationFrame`
- Color class: add `.up` (green) or `.down` (red) based on `pChange`, with a 500ms flash animation on each update
- Market status badge: `NSE OPEN` in green / `NSE CLOSED` in grey
- IST clock that ticks every second: `new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', ... })`

### 4.3 News Feed Component (`src/components/news-feed.ts`)

- Render articles as cards. Card HTML structure:
```html
<div class="article-card" data-id="{id}" data-category="{category}">
  <span class="source-badge">{source}</span>
  <span class="category-badge {category}">{category}</span>
  <span class="time-ago">{relativeTime}</span>
  <h3 class="article-title">{title}</h3>
  <p class="article-summary">{summary}</p>
</div>
```
- New articles animate in from the top with a slide-down + fade-in CSS animation
- Clicking a card opens `article.link` in a new tab
- On category filter change, re-render only filtered articles (do NOT re-fetch)
- **Performance:** Keep max 200 articles in DOM. Remove oldest when count exceeds 200.

### 4.4 Market Panel Component (`src/components/market-panel.ts`)

Three sections, top to bottom:

**Section A — Top Movers Table**
Two tabs: `GAINERS` and `LOSERS`. Show top 5 each. Columns: Symbol | LTP | % Change.

**Section B — Market Breadth**
Show Advances / Declines / Unchanged as a horizontal bar divided into 3 colored segments.

**Section C — FII/DII Activity**
Two rows. Each shows: Label | Net Buy/Sell amount (in ₹ Cr) | Color coded.

### 4.5 Sector Heatmap Component (`src/components/sector-heatmap.ts`)

8 sector tiles in a 4×2 grid. Each tile:
- Label: "IT", "BANK", "AUTO", "FMCG", "PHARMA", "INFRA", "METAL", "ENERGY"
- Index used: Map each to its NSE sectoral index (NIFTY IT, NIFTY BANK, etc.)
- Background color: interpolate between `#1a3a2a` (dark green, max +3%) and `#3a1a1a` (dark red, max -3%) based on `pChange`
- Show `pChange` value centered in the tile in bold

### 4.6 AI Brief Component (`src/components/ai-brief.ts`)

- Sits at the top of the news feed column
- Shows a 4–6 bullet synthesis of the last 30 minutes of news
- Has a `[Refresh]` button that triggers a new AI call
- During loading, show a pulsing skeleton loader
- Display the time of last refresh: `"Last updated 3 min ago"`

---

## Phase 5 — AI News Synthesis (Backend)

### 5.1 Endpoint: `POST /api/ai/brief`

**Request body:**
```json
{ "articles": [ { "title": "...", "summary": "...", "source": "...", "pubDate": "..." } ] }
```

**Logic:**
1. Take the 25 most recent articles from the last 45 minutes
2. Send to Claude API with this exact system prompt:

```
You are a terse market intelligence analyst for Indian equity markets.
Given a set of recent news headlines and summaries, produce exactly 5 bullet points.

Rules:
- Each bullet must be max 15 words
- Format: [SIGNAL_TYPE] Description  (SIGNAL_TYPE: BULLISH / BEARISH / NEUTRAL / WATCH / ALERT)
- Focus on actionable market implications, not just news recaps
- Mention specific indices, sectors, or companies where relevant (NSE/BSE names)
- Do not pad. If fewer than 5 meaningful signals exist, produce fewer bullets.
- Output ONLY the bullet points. No preamble, no explanation.

Example output:
• [BEARISH] FII net sold ₹2,400 Cr in equities; BankNifty likely under pressure
• [BULLISH] RBI holds rates; rate-sensitive NBFC and housing stocks to benefit
• [WATCH] IT sector facing wage inflation headwinds per TCS and Infosys commentary
• [ALERT] SEBI issued show-cause notice to 3 mid-cap promoters — check NSE circulars
• [NEUTRAL] Global crude at $78; neutral for OMCs at current margins
```

3. Return bullets as an array of strings to the frontend

### 5.2 Claude API Call

```typescript
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: "claude-haiku-4-5",   // Use Haiku for speed + cost on frequent calls
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: articlesText }],
  }),
});
```

**Rate limiting:** Cache the AI brief in Redis with key `ai:brief` and TTL = 3 minutes. Do not regenerate more often than that.

---

## Phase 6 — Signal Convergence Engine (`src/services/signals.ts`)

This is the intelligence layer. A signal fires when multiple independent data streams point in the same direction within a 30-minute window. Start with these 6 hard-coded rules:

```typescript
const SIGNAL_RULES: SignalRule[] = [
  {
    id: "banking-stress",
    label: "Banking Stress Signal",
    description: "RBI news + FII net sell + BankNifty drop converging",
    check: (state) =>
      hasRecentArticle(state.articles, ["RBI", "rate", "liquidity"], 30) &&
      state.market?.indices.find(i => i.name === "NIFTY BANK")?.pChange < -0.8 &&
      getFiiNetActivity(state.market) < -500, // Net sell > ₹500 Cr
  },
  {
    id: "it-sector-pressure",
    label: "IT Sector Pressure",
    description: "USD/INR move + IT earnings commentary + Nifty IT decline",
    check: (state) =>
      hasRecentArticle(state.articles, ["rupee", "dollar", "USD", "INR"], 60) &&
      state.market?.indices.find(i => i.name === "NIFTY IT")?.pChange < -0.5,
  },
  {
    id: "policy-event",
    label: "Policy Event Active",
    description: "RBI MPC or SEBI board meeting in progress",
    check: (state) =>
      hasRecentArticle(state.articles, ["MPC", "monetary policy", "SEBI board"], 120),
  },
  {
    id: "broad-market-rally",
    label: "Broad Market Rally",
    description: "Advances > 1600 + FII buying + Nifty 50 +1%",
    check: (state) =>
      (state.market?.advances ?? 0) > 1600 &&
      state.market?.indices.find(i => i.name === "NIFTY 50")?.pChange > 1.0 &&
      getFiiNetActivity(state.market) > 500,
  },
  {
    id: "high-volatility",
    label: "High Volatility Warning",
    description: "India VIX above 18",
    check: (state) => (state.market?.vix ?? 0) > 18,
  },
  {
    id: "circuit-breaker-watch",
    label: "Circuit Breaker Watch",
    description: "Nifty 50 down > 2% — market halt possible at -5%",
    check: (state) =>
      (state.market?.indices.find(i => i.name === "NIFTY 50")?.pChange ?? 0) < -2.0,
  },
];
```

Each active signal renders as a pill in the bottom signal bar with a pulsing amber/red dot.

---

## Phase 7 — Polling & Update Loop

### 7.1 Frontend Polling (`src/services/rss.ts`, `src/services/market-data.ts`)

```typescript
// On app init — src/main.ts
async function startPolling() {
  await Promise.all([fetchNews(), fetchMarket()]);  // Initial load
  renderAll();

  setInterval(fetchNews, 90_000);    // RSS: 90s
  setInterval(fetchMarket, 15_000);  // Market: 15s during hours
  setInterval(fetchAiBrief, 180_000); // AI brief: 3 min
}
```

### 7.2 Market Hours Detection

```typescript
function isMarketOpen(): boolean {
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hours = ist.getHours();
  const minutes = ist.getMinutes();
  const day = ist.getDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return false;
  const timeInMin = hours * 60 + minutes;
  return timeInMin >= 555 && timeInMin <= 935; // 09:15 to 15:35
}
```

---

## Phase 8 — Environment Variables & Configuration

### `.env.example`
```
# Backend
ANTHROPIC_API_KEY=sk-ant-...
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
PORT=3001

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:3001
```

### `src/config.ts`
```typescript
export const CONFIG = {
  API_BASE: import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001",
  POLL_INTERVALS: {
    NEWS_MS: 90_000,
    MARKET_MS: 15_000,
    AI_BRIEF_MS: 180_000,
  },
  MAX_ARTICLES_IN_DOM: 200,
  DEDUP_WINDOW_HOURS: 6,
  SIGNAL_WINDOW_MINUTES: 30,
};
```

---

## Phase 9 — Deployment

### 9.1 Frontend → Vercel

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/api/(.*)", "destination": "https://your-railway-app.railway.app/api/$1" }]
}
```

### 9.2 Backend → Railway

- Add `Procfile`: `web: node dist/server/index.js`
- Set all env vars in Railway dashboard
- Expose port from `process.env.PORT`
- Dockerfile optional — Railway auto-detects Node.js

### 9.3 Redis → Upstash

- Create a free Upstash Redis database at upstash.com
- Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` into Railway env vars

---

## Phase 10 — Indian Market Specific Details

### Trading Calendar
NSE is closed on: Republic Day (Jan 26), Holi, Good Friday, Ambedkar Jayanti, Ram Navami, Maharashtra Day, Independence Day (Aug 15), Ganesh Chaturthi, Dussehra, Diwali Laxmi Pujan, Diwali Balipratipada, Gurunanak Jayanti, Christmas.
Maintain a hardcoded `NSE_HOLIDAYS` array in `config.ts` and factor into `isMarketOpen()`.

### Number Formatting (Indian System)
```typescript
// Always use Indian number system: 1,00,000 not 100,000
export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(value);
}

// For crores: ₹1,234.56 Cr
export function formatCr(value: number): string {
  return `₹${formatINR(value / 1_00_00_000)} Cr`;
}
```

### Sector Index Mapping
```typescript
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
```

---

## Build Order for Agent

Execute phases strictly in this sequence. Do not start a phase until the prior one renders correctly in the browser.

1. Phase 1 → Static layout renders in browser with dummy data hardcoded
2. Phase 2 → Backend RSS endpoint returns real articles via `curl http://localhost:3001/api/rss`
3. Phase 3 → Backend market endpoint returns real NSE data via `curl http://localhost:3001/api/market`
4. Phase 4 → Frontend fetches from backend, DOM updates with real data
5. Phase 5 → AI brief generates and renders in feed column
6. Phase 6 → At least 2 signal rules fire correctly when conditions are met (test with mock data first)
7. Phase 7 → All polling intervals active, page stays live for 10 min without errors
8. Phase 8 → All secrets moved to `.env`, no hardcoded keys
9. Phase 9 → Deployed: frontend on Vercel, backend on Railway, connected end-to-end
10. Phase 10 → INR formatting, IST timezone, and market calendar verified correct

---

## Non-Goals (Do Not Build)

- No user accounts or authentication
- No database (Redis cache only)
- No historical charting (use TradingView widget embed if needed)
- No mobile app (responsive web is sufficient)
- No WebSocket (polling is intentional — simpler and reliable enough)
- No paid data APIs in v1 (all sources must be free/public)