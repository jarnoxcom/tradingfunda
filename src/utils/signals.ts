import { MarketSnapshot, Article, Signal } from "../types";

export function analyzeSignalConvergence(
  market: MarketSnapshot | null,
  articles: Article[]
): Signal[] {
  const signals: Signal[] = [];
  if (!market) return signals;

  // 1. Banking Stress Signal
  const bankNifty = market.indices.find(idx => idx.name === "NIFTY BANK");
  const bankDrop = bankNifty ? bankNifty.pChange < -0.75 : false;
  const fiiSelling = market.fiiNet !== undefined && market.fiiNet < -500;
  
  if (bankDrop && fiiSelling) {
    signals.push({
      id: "banking-stress",
      label: "BANKING STRESS CONVERGENCE",
      description: `FII selling (${market.fiiNet} Cr) + Nifty Bank drop (${bankNifty?.pChange.toFixed(2)}%) converging into banking sectoral headwind.`,
      isRed: true,
    });
  }

  // 2. IT Sector Outperformance
  const itIndex = market.indices.find(idx => idx.name === "NIFTY IT");
  const itSurge = itIndex ? itIndex.pChange > 2.0 : false;
  const hasItNews = articles.some(
    a => a.category === "earnings" && (a.title.includes("TCS") || a.title.includes("Infosys") || a.title.includes("IT"))
  );

  if (itSurge || (itIndex && itIndex.pChange > 1.5 && hasItNews)) {
    signals.push({
      id: "it-outperformance",
      label: "IT OUTPERFORMANCE ACTIVE",
      description: `Nifty IT gaining ${itIndex?.pChange.toFixed(2)}% backed by robust corporate earnings/spend signals.`,
      isRed: false,
    });
  }

  // 3. High Market Volatility (VIX)
  const vix = market.vix;
  if (vix > 15.0) {
    signals.push({
      id: "high-vix",
      label: "INTRADAY VOLATILITY SPIKE",
      description: `India VIX trading at ${vix.toFixed(2)} (+${((vix - 13.0) / 13.0 * 100).toFixed(1)}%). Caution on premium decay and high margin requirements.`,
      isRed: true,
    });
  }

  // 4. Broad Market Selling
  const decl = market.declines;
  const adv = market.advances;
  if (decl > 32 && decl > adv * 1.5) {
    signals.push({
      id: "market-selloff",
      label: "BROAD MARKET SELLING",
      description: `Declines (${decl}) significantly outpacing Advances (${adv}). Sector-wide risk off sentiment dominant.`,
      isRed: true,
    });
  }

  // 5. Rate Sensitive NBFC Watch
  const rbiNews = articles.filter(a => a.category === "rbi").slice(0, 2);
  if (rbiNews.length > 0) {
    signals.push({
      id: "rbi-policy-watch",
      label: "RBI POLICY DECISION ACTIVE",
      description: `Recent central bank updates active: "${rbiNews[0].title.slice(0, 50)}...". Watch rate sensitive counters.`,
      isRed: false,
    });
  }

  return signals;
}
