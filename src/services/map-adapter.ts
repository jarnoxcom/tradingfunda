import { Article, MarketSnapshot, Hotspot, EconomicCenter } from '../types';
import { INTEL_HOTSPOTS } from '../config/geo';

export interface NewsPulse {
  lat: number;
  lon: number;
  title: string;
  locationName: string;
  intensity: 'low' | 'medium' | 'high';
  articles: Article[];
}

export interface DynamicMapData {
  activeHotspotIds: Set<string>;
  countryRiskMap: Record<string, 'low' | 'moderate' | 'high' | 'severe'>;
  hotspotNews: Record<string, Article[]>;
  economicCenterStatus: Record<string, { change: number; text: string }>;
  newsPulses: NewsPulse[];
}

// Simple country name/code to keyword matching
const COUNTRY_KEYWORDS: Record<string, { code: string; keywords: string[] }> = {
  US: { code: 'USA', keywords: ['us', 'usa', 'united states', 'america', 'washington', 'fed', 'federal reserve', 'nyse', 'nasdaq', 'pentagon'] },
  CN: { code: 'CHN', keywords: ['china', 'chinese', 'beijing', 'shanghai', 'xi jinping', 'pla', 'shenzhen'] },
  GB: { code: 'GBR', keywords: ['uk', 'britain', 'british', 'london', 'gchq', 'mi6', 'lse'] },
  IN: { code: 'IND', keywords: ['india', 'indian', 'mumbai', 'delhi', 'nifty', 'bse', 'nse', 'rbi', 'gift city', 'gail'] },
  RU: { code: 'RUS', keywords: ['russia', 'russian', 'moscow', 'putin', 'kremlin', 'wagner', 'fsb'] },
  UA: { code: 'UKR', keywords: ['ukraine', 'ukrainian', 'kyiv', 'kiev', 'donbas', 'zelensky'] },
  SA: { code: 'SAU', keywords: ['saudi', 'riyadh', 'aramco', 'opec', 'mbs'] },
  IR: { code: 'IRN', keywords: ['iran', 'iranian', 'tehran', 'irgc', 'khamenei'] },
  IL: { code: 'ISR', keywords: ['israel', 'israeli', 'tel aviv', 'idf', 'mossad', 'netanyahu'] },
  KP: { code: 'PRK', keywords: ['north korea', 'pyongyang', 'dprk', 'kim jong'] },
  JP: { code: 'JPN', keywords: ['japan', 'japanese', 'tokyo', 'yen', 'boj'] },
  DE: { code: 'DEU', keywords: ['germany', 'german', 'frankfurt', 'berlin', 'dax'] },
  FR: { code: 'FRA', keywords: ['france', 'french', 'paris', 'macron'] },
  EG: { code: 'EGY', keywords: ['egypt', 'cairo', 'sisi', 'suez'] },
  YE: { code: 'YEM', keywords: ['yemen', 'yemeni', 'houthi', 'red sea', 'sanaa'] },
  MX: { code: 'MEX', keywords: ['mexico', 'mexican', 'cartel', 'sinaloa', 'cjng'] },
  HT: { code: 'HTI', keywords: ['haiti', 'haitian', 'gangs', 'port-au-prince'] }
};

export function getDynamicMapData(market: MarketSnapshot | null, articles: Article[]): DynamicMapData {
  const activeHotspotIds = new Set<string>();
  const countryRiskMap: Record<string, 'low' | 'moderate' | 'high' | 'severe'> = {
    // Default baselines
    IRN: 'severe',
    UKR: 'severe',
    PSE: 'severe',
    YEM: 'high',
    RUS: 'high',
    AFG: 'moderate',
    MMR: 'moderate',
    SOM: 'moderate'
  };

  const hotspotNews: Record<string, Article[]> = {};
  const newsPulses: NewsPulse[] = [];

  // Match articles to hotspots and countries
  articles.forEach((article) => {
    const text = (article.title + ' ' + (article.summary || '')).toLowerCase();
    
    // 1. Check Intel Hotspots
    INTEL_HOTSPOTS.forEach((hotspot) => {
      const match = hotspot.keywords.some(kw => text.includes(kw));
      if (match) {
        activeHotspotIds.add(hotspot.id);
        if (!hotspotNews[hotspot.id]) hotspotNews[hotspot.id] = [];
        hotspotNews[hotspot.id].push(article);
      }
    });

    // 2. Check Countries for Risk elevation
    Object.entries(COUNTRY_KEYWORDS).forEach(([, info]) => {
      const match = info.keywords.some(kw => text.includes(kw));
      if (match) {
        // Escalate risk based on category (e.g. global macro / conflict mentions)
        const current = countryRiskMap[info.code] || 'low';
        if (current === 'low') {
          countryRiskMap[info.code] = 'moderate';
        } else if (current === 'moderate') {
          countryRiskMap[info.code] = 'high';
        }
      }
    });
  });

  // Generate dynamic news pulse markers on the map for the latest articles
  articles.slice(0, 8).forEach((article) => {
    // Attempt to geolocate article based on keywords
    let bestLoc: { name: string; lat: number; lon: number } | null = null;

    // Search for matches in hotspots first
    for (const hotspot of INTEL_HOTSPOTS) {
      if (hotspot.keywords.some(kw => article.title.toLowerCase().includes(kw))) {
        bestLoc = { name: hotspot.name, lat: hotspot.lat, lon: hotspot.lon };
        break;
      }
    }

    // Fallback to capital/major cities of countries
    if (!bestLoc) {
      if (article.title.toLowerCase().includes('us') || article.title.toLowerCase().includes('fed') || article.title.toLowerCase().includes('dollar')) {
        bestLoc = { name: 'New York', lat: 40.7128, lon: -74.0060 };
      } else if (article.title.toLowerCase().includes('china') || article.title.toLowerCase().includes('beijing')) {
        bestLoc = { name: 'Beijing', lat: 39.9042, lon: 116.4074 };
      } else if (article.title.toLowerCase().includes('uk') || article.title.toLowerCase().includes('london')) {
        bestLoc = { name: 'London', lat: 51.5074, lon: -0.1278 };
      } else if (article.title.toLowerCase().includes('japan') || article.title.toLowerCase().includes('tokyo')) {
        bestLoc = { name: 'Tokyo', lat: 35.6762, lon: 139.6503 };
      } else if (article.title.toLowerCase().includes('saudi') || article.title.toLowerCase().includes('oil')) {
        bestLoc = { name: 'Riyadh', lat: 24.7136, lon: 46.6753 };
      } else {
        // Default to Mumbai if it's general Indian news
        bestLoc = { name: 'Mumbai', lat: 19.0760, lon: 72.8777 };
      }
    }

    if (bestLoc) {
      const existing = newsPulses.find(p => Math.abs(p.lat - bestLoc!.lat) < 1.0 && Math.abs(p.lon - bestLoc!.lon) < 1.0);
      if (existing) {
        existing.articles.push(article);
        if (existing.articles.length > 2) existing.intensity = 'high';
        else existing.intensity = 'medium';
      } else {
        newsPulses.push({
          lat: bestLoc.lat,
          lon: bestLoc.lon,
          title: article.title,
          locationName: bestLoc.name,
          intensity: 'low',
          articles: [article]
        });
      }
    }
  });

  // 3. Map Market Snapshot to Economic Center States
  const economicCenterStatus: Record<string, { change: number; text: string }> = {};

  if (market) {
    // Map Nifty/BSE changes to Mumbai nodes
    const nifty = market.indices.find(idx => idx.name.includes('NIFTY 50'));
    const niftyChange = nifty ? nifty.pChange : 0;
    
    economicCenterStatus['nse-india'] = { change: niftyChange, text: nifty ? `Nifty: ${niftyChange >= 0 ? '+' : ''}${niftyChange.toFixed(2)}%` : 'NSE' };
    economicCenterStatus['bse-india'] = { change: niftyChange, text: nifty ? `BSE: ${niftyChange >= 0 ? '+' : ''}${niftyChange.toFixed(2)}%` : 'BSE' };
    economicCenterStatus['rbi'] = { change: 0, text: `RBI Status: ${market.marketStatus}` };

    // Map top gainers/losers to highlight other global exchanges if they correlate
    // For example, if VIX is spiking, mark US/Europe exchanges as degraded/negative
    const vixSpike = market.vix > 18;
    const globalStatusText = vixSpike ? 'VIX elevated' : 'VIX stable';
    const globalChange = vixSpike ? -0.8 : 0.2;

    economicCenterStatus['nyse'] = { change: globalChange, text: `NYSE (${globalStatusText})` };
    economicCenterStatus['nasdaq'] = { change: globalChange, text: `NASDAQ (${globalStatusText})` };
    economicCenterStatus['fed'] = { change: 0, text: `Fed Reserve (Watch: VIX ${market.vix.toFixed(1)})` };
    economicCenterStatus['lse'] = { change: globalChange, text: 'LSE (London)' };
    economicCenterStatus['ecb'] = { change: 0, text: 'ECB' };
    economicCenterStatus['boj'] = { change: 0.1, text: 'Bank of Japan' };
  }

  return {
    activeHotspotIds,
    countryRiskMap,
    hotspotNews,
    economicCenterStatus,
    newsPulses
  };
}
