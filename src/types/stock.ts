export type Sector = 'IT'|'Banking'|'Pharma'|'Auto'|'FMCG'|'Metal'|'Energy'|'Realty'|'Telecom'|'Infrastructure'|'Media'|'Chemicals'|'Others'
export type MarketCapCategory = 'Large Cap'|'Mid Cap'|'Small Cap'|'Micro Cap'
export type MACDSignal = 'Bullish'|'Bearish'|'Neutral'
export type BollingerPosition = 'Above'|'Within'|'Below'
export type VolumeVsAvg = 'Below'|'Above'|'2x'|'3x'
export type IndexName = 'NIFTY 50'|'NIFTY Next 50'|'NIFTY Midcap 100'|'NIFTY Smallcap 250'|'BSE Sensex'
export interface Stock {
  symbol: string; companyName: string; sector: Sector; industry: string
  marketCapCategory: MarketCapCategory; indexMembership: IndexName[]
  lastPrice: number; previousClose: number; dayOpen: number; dayHigh: number; dayLow: number
  changePercent: number; changeAbsolute: number; volume: number; avgVolume20D: number
  week52High: number; week52Low: number; marketCap: number; pe: number|null; pb: number
  dividendYield: number; eps: number; roe: number; roce: number; debtToEquity: number
  currentRatio: number; promoterHolding: number; revenueGrowthYoY: number; profitGrowthYoY: number
  rsi14: number; sma50: number; sma200: number; beta: number; atr: number
  macdSignal: MACDSignal; bollingerPosition: BollingerPosition; volumeVsAvg: VolumeVsAvg
  lastUpdated: number; recentlyUpdated: boolean
  /** true when lastPrice comes from a real market feed (false/undefined = simulated placeholder) */
  isLive?: boolean
  /** promoter group for real companies (Tata, Reliance (Jio), Aditya Birla...) */
  group?: string
  /** true for real listed companies (vs generated placeholders) */
  isReal?: boolean
  country?: string
}
export type FilterOperator = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'between'|'in'|'notIn'
export type FilterValue = number|string|boolean|number[]|string[]
export interface FilterConfig { id: string; field: keyof Stock; operator: FilterOperator; value: FilterValue; enabled: boolean; label?: string }
export interface FilterPreset { id: string; name: string; description: string; filters: FilterConfig[] }
export interface SortConfig { column: keyof Stock; direction: 'asc'|'desc' }
export interface PriceUpdate { symbol: string; lastPrice: number; changePercent: number; changeAbsolute: number; volume: number; timestamp: number; source?: 'live'|'sim' }
export interface OHLCV { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface ApiResponse<T> { success: boolean; data: T; meta: { total: number; page: number; pageSize: number; timestamp: string; executionTimeMs: number }; error?: { code: string; message: string } }
