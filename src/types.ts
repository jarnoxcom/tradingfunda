export interface Article {
  id: string;           // MD5 of link
  title: string;
  summary: string;      // First 200 chars of content, HTML stripped
  link: string;
  pubDate: string;      // ISO 8601
  source: string;       // "ET Markets"
  category: string;     // "market" | "sebi" | "rbi" | "macro" | "earnings" | "global"
  imageUrl?: string;    // og:image if present
}

export interface IndexData {
  name: string;         // "NIFTY 50"
  last: number;         // 24532.10
  change: number;       // 98.50
  pChange: number;      // 0.40  (percent)
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

export interface Mover {
  symbol: string;       // "RELIANCE"
  company: string;      // "Reliance Industries Ltd"
  ltp: number;          // Last traded price
  pChange: number;      // % change
  volume: number;
}

export interface MarketSnapshot {
  indices: IndexData[];
  topGainers: Mover[];
  topLosers: Mover[];
  advances: number;
  declines: number;
  unchanged: number;
  vix: number;
  marketStatus: "OPEN" | "CLOSED" | "PRE_OPEN";
  lastUpdated: string;
  fiiNet?: number;      // FII Net Buy/Sell in Cr
  diiNet?: number;      // DII Net Buy/Sell in Cr
}

export interface Signal {
  id: string;
  label: string;
  description: string;
  isRed?: boolean;
}

export interface SignalRule {
  id: string;
  label: string;
  description: string;
  check: (state: AppState) => boolean;
}

export interface AppState {
  articles: Article[];
  market: MarketSnapshot | null;
  activeCategory: string;        // "all" | "market" | "sebi" | ...
  signals: Signal[];
  aiBrief: string[];
  lastFetch: number;
  aiBriefLastUpdated?: number;
  aiBriefLoading?: boolean;
}

export interface HistoricalContext {
  lastMajorEvent?: string;
  lastMajorEventDate?: string;
  precedentCount?: number;
  precedentDescription?: string;
  cyclicalRisk?: string;
}

export type EscalationTrend = 'escalating' | 'stable' | 'de-escalating';

export interface Hotspot {
  id: string;
  name: string;
  lat: number;
  lon: number;
  keywords: string[];
  subtext?: string;
  location?: string;
  agencies?: string[];
  level?: 'low' | 'elevated' | 'high';
  description?: string;
  status?: string;
  escalationScore?: 1 | 2 | 3 | 4 | 5;
  escalationTrend?: EscalationTrend;
  escalationIndicators?: string[];
  history?: HistoricalContext;
  whyItMatters?: string;
}

export interface StrategicWaterway {
  id: string;
  chokepointId: string;
  name: string;
  lat: number;
  lon: number;
  description?: string;
}

export interface ConflictZone {
  id: string;
  name: string;
  coords: [number, number][];
  center: [number, number];
  intensity?: 'high' | 'medium' | 'low';
  parties?: string[];
  casualties?: string;
  displaced?: string;
  keywords?: string[];
  startDate?: string;
  location?: string;
  description?: string;
  keyDevelopments?: string[];
}

export type MilitaryBaseType =
  | 'us-nato'
  | 'china'
  | 'russia'
  | 'uk'
  | 'france'
  | 'india'
  | 'italy'
  | 'uae'
  | 'turkey'
  | 'japan'
  | 'other';

export interface MilitaryBase {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: MilitaryBaseType;
  description?: string;
  country?: string;
  arm?: string;
  status?: 'active' | 'planned' | 'controversial' | 'closed';
  source?: string;
}

export interface CableLandingPoint {
  country: string;
  countryName: string;
  city?: string;
  lat: number;
  lon: number;
}

export interface CountryCapacity {
  country: string;
  capacityShare: number;
  isRedundant: boolean;
}

export interface UnderseaCable {
  id: string;
  name: string;
  points: [number, number][];
  major?: boolean;
  landingPoints?: CableLandingPoint[];
  countriesServed?: CountryCapacity[];
  capacityTbps?: number;
  rfsYear?: number;
  owners?: string[];
}

export type NuclearFacilityType =
  | 'plant'
  | 'enrichment'
  | 'reprocessing'
  | 'weapons'
  | 'ssbn'
  | 'test-site'
  | 'icbm'
  | 'research';

export interface NuclearFacility {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: NuclearFacilityType;
  status: 'active' | 'contested' | 'inactive' | 'decommissioned' | 'construction';
  operator?: string;
}

export type PipelineType = 'oil' | 'gas' | 'products';
export type PipelineStatus = 'operating' | 'construction';

export interface PipelineTerminal {
  country: string;
  name?: string;
  portId?: string;
  lat?: number;
  lon?: number;
}

export interface Pipeline {
  id: string;
  name: string;
  type: PipelineType;
  status: PipelineStatus;
  points: [number, number][];
  capacity?: string;
  length?: string;
  operator?: string;
  countries?: string[];
  origin?: PipelineTerminal;
  destination?: PipelineTerminal;
  transitCountries?: string[];
  capacityMbpd?: number;
  capacityBcmY?: number;
  alternatives?: string[];
}

export type EconomicCenterType = 'exchange' | 'central-bank' | 'financial-hub';

export interface EconomicCenter {
  id: string;
  name: string;
  type: EconomicCenterType;
  lat: number;
  lon: number;
  country: string;
  marketHours?: { open: string; close: string; timezone: string };
  description?: string;
}

export interface Spaceport {
  id: string;
  name: string;
  lat: number;
  lon: number;
  country: string;
  operator: string;
  status: 'active' | 'construction' | 'inactive';
  launches: 'High' | 'Medium' | 'Low';
}

export interface CriticalMineralProject {
  id: string;
  name: string;
  lat: number;
  lon: number;
  mineral: string;
  country: string;
  operator: string;
  status: 'producing' | 'development' | 'exploration';
  significance: string;
}

