import { MarketSnapshot, Article, Signal } from "../types";

export const MOCK_MARKET: MarketSnapshot = {
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
  marketStatus: "OPEN",
  lastUpdated: new Date().toISOString(),
  fiiNet: -620.50, // net sold
  diiNet: 940.20  // net bought
};

export const MOCK_ARTICLES: Article[] = [
  {
    id: "a1",
    title: "RBI Holds Repo Rate at 6.5%, Maintains 'Withdrawal of Accommodation' Stance",
    summary: "The Reserve Bank of India monetary policy committee has decided to keep interest rates unchanged, aligned with consensus market expectations, focusing on core inflation control.",
    link: "https://rbi.org.in",
    pubDate: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 min ago
    source: "RBI Press",
    category: "rbi"
  },
  {
    id: "a2",
    title: "FII Net Outflows Exceed ₹2,400 Cr in Financial Services Sector Amid Rebalancing",
    summary: "Foreign Institutional Investors continued their selling streak in banking majors HDFC Bank and ICICI Bank, dragging down Nifty Bank index by nearly 1%.",
    link: "https://economictimes.indiatimes.com",
    pubDate: new Date(Date.now() - 15 * 60 * 1000).toISOString(), // 15 min ago
    source: "ET Markets",
    category: "market"
  },
  {
    id: "a3",
    title: "TCS Reports Outstanding Q1 Earnings; IT Services Spending Rebounds In US",
    summary: "Tata Consultancy Services kickstarts earnings season with a robust 8.5% YoY profit rise, driving a stellar 3% rally across major Nifty IT index constituents.",
    link: "https://www.moneycontrol.com",
    pubDate: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 min ago
    source: "Moneycontrol",
    category: "earnings"
  },
  {
    id: "a4",
    title: "SEBI Issues New Guidelines to Restrict Arbitrage in Mid-Cap Option Expiries",
    summary: "The capital markets regulator SEBI introduced structural rules aimed at curbing intraday volatility and retail speculation in weekly option contracts.",
    link: "https://www.sebi.gov.in",
    pubDate: new Date(Date.now() - 40 * 60 * 1000).toISOString(), // 40 min ago
    source: "SEBI Circulars",
    category: "sebi"
  },
  {
    id: "a5",
    title: "Rupee Depreciates to 83.58 Against USD as Oil Importers Bid Heavily for Greenback",
    summary: "The Indian rupee hits a new intra-day low of 83.58, pressured by heavy demand for US dollars from oil marketing companies and weak global cues.",
    link: "https://www.livemint.com",
    pubDate: new Date(Date.now() - 55 * 60 * 1000).toISOString(), // 55 min ago
    source: "LiveMint",
    category: "macro"
  }
];

export const MOCK_AI_BRIEF: string[] = [
  "• [BULLISH] TCS earnings beat expectations; IT sector leads index rally with +3% gains",
  "• [BEARISH] Heavy FII net selling drags down BankNifty; private banking stocks under stress",
  "• [WATCH] RBI holds policy rates; NBFCs and real estate sectors remain rate-sensitive focus",
  "• [ALERT] SEBI introduces weekly expiry curbs to cool speculative options trading volumes",
  "• [NEUTRAL] Crude prices trade rangebound at $78; neutral for national oil marketing margins"
];

export const MOCK_SIGNALS: Signal[] = [
  {
    id: "banking-stress",
    label: "Banking Stress Active",
    description: "RBI rate caution + FII banking sell-off + BankNifty dropping -0.79% converging",
    isRed: false
  },
  {
    id: "it-sector-rally",
    label: "IT Sector Outperformance",
    description: "TCS robust earnings comment + Nifty IT surging +3.08%",
    isRed: false
  }
];
