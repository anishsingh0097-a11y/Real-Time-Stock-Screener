// Server-side only: real NSE quotes from Yahoo Finance's public chart endpoint (no API key).
// Unofficial/unsupported feed - fine for demos and learning; use a licensed data vendor for production.
import type { Stock } from '@/types/stock'

export interface RealQuote {
  symbol: string
  lastPrice: number
  previousClose: number
  changeAbsolute: number
  changePercent: number
  volume: number
  dayHigh?: number
  dayLow?: number
  week52High?: number
  week52Low?: number
  /** exchange timestamp of the last trade, ms since epoch */
  marketTime: number
}

const YAHOO_CHART = process.env.QUOTE_API_BASE ?? 'https://query1.finance.yahoo.com/v8/finance/chart/'
const FAIL_TTL_MS = 3000

const r2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined)

/** RELIANCE -> RELIANCE.NS ; M&M -> M%26M.NS */
export function toYahooSymbol(symbol: string): string {
  if (symbol.endsWith('.US')) return encodeURIComponent(symbol.slice(0, -3)) // US tickers have no suffix on Yahoo
  return `${encodeURIComponent(symbol)}.NS`
}

interface ChartMeta {
  regularMarketPrice?: unknown; chartPreviousClose?: unknown; previousClose?: unknown
  regularMarketVolume?: unknown; regularMarketDayHigh?: unknown; regularMarketDayLow?: unknown
  fiftyTwoWeekHigh?: unknown; fiftyTwoWeekLow?: unknown; regularMarketTime?: unknown
}

export function parseChartResponse(symbol: string, json: unknown): RealQuote | null {
  const meta = (json as { chart?: { result?: Array<{ meta?: ChartMeta }> | null } } | null)?.chart?.result?.[0]?.meta
  if (!meta) return null
  const price = num(meta.regularMarketPrice)
  const prev = num(meta.chartPreviousClose) ?? num(meta.previousClose)
  if (!price || price <= 0 || !prev || prev <= 0) return null
  const change = price - prev
  const t = num(meta.regularMarketTime)
  const hi = num(meta.regularMarketDayHigh), lo = num(meta.regularMarketDayLow)
  const h52 = num(meta.fiftyTwoWeekHigh), l52 = num(meta.fiftyTwoWeekLow)
  return {
    symbol,
    lastPrice: r2(price),
    previousClose: r2(prev),
    changeAbsolute: r2(change),
    changePercent: r2((change / prev) * 100),
    volume: Math.round(num(meta.regularMarketVolume) ?? 0),
    ...(hi !== undefined && { dayHigh: r2(hi) }),
    ...(lo !== undefined && { dayLow: r2(lo) }),
    ...(h52 !== undefined && { week52High: r2(h52) }),
    ...(l52 !== undefined && { week52Low: r2(l52) }),
    marketTime: t !== undefined ? t * 1000 : Date.now(),
  }
}

export interface FetchOptions {
  ttlMs?: number
  concurrency?: number
  timeoutMs?: number
  fetchImpl?: typeof fetch
  now?: () => number
}

const cache = new Map<string, { at: number; quote: RealQuote | null }>()
const inflight = new Map<string, Promise<Map<string, RealQuote>>>()

export function __resetRealQuoteCache(): void { cache.clear(); inflight.clear() }

async function fetchOne(symbol: string, timeoutMs: number, fetchImpl: typeof fetch): Promise<RealQuote | null> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(`${YAHOO_CHART}${toYahooSymbol(symbol)}?interval=1m&range=1d`, {
      signal: ctrl.signal,
      cache: 'no-store',
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockScreenerPro/1.0)', Accept: 'application/json' },
    })
    if (!res.ok) return null
    return parseChartResponse(symbol, await res.json())
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Fetch real quotes for many symbols. Results are cached for `ttlMs` (default 8s) so many browser
 * tabs polling every 2s still cause only ~1 upstream request per symbol per 8s. Failed symbols are
 * simply absent from the result map (callers fall back to their existing price).
 */
export function fetchRealQuotes(symbols: string[], opts: FetchOptions = {}): Promise<Map<string, RealQuote>> {
  const key = symbols.join(',')
  const existing = inflight.get(key)
  if (existing) return existing
  const p = run(symbols, opts).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

async function run(symbols: string[], opts: FetchOptions): Promise<Map<string, RealQuote>> {
  const { ttlMs = 8000, concurrency = 8, timeoutMs = 5000, fetchImpl = fetch, now = Date.now } = opts
  const stale = symbols.filter(s => {
    const c = cache.get(s)
    return !c || now() - c.at > (c.quote ? ttlMs : FAIL_TTL_MS)
  })
  let next = 0
  const workers = Array.from({ length: Math.min(concurrency, stale.length) }, async () => {
    while (next < stale.length) {
      const s = stale[next++]!
      cache.set(s, { at: now(), quote: await fetchOne(s, timeoutMs, fetchImpl) })
    }
  })
  await Promise.all(workers)
  const out = new Map<string, RealQuote>()
  for (const s of symbols) { const q = cache.get(s)?.quote; if (q) out.set(s, q) }
  return out
}

/** Overlay a real quote onto a (mock) stock record. Fundamentals/technicals stay as they were. */
export function applyRealQuote(stock: Stock, q: RealQuote): Stock {
  return {
    ...stock,
    lastPrice: q.lastPrice,
    previousClose: q.previousClose,
    changeAbsolute: q.changeAbsolute,
    changePercent: q.changePercent,
    volume: q.volume || stock.volume,
    dayHigh: q.dayHigh ?? stock.dayHigh,
    dayLow: q.dayLow ?? stock.dayLow,
    week52High: q.week52High ?? stock.week52High,
    week52Low: q.week52Low ?? stock.week52Low,
    lastUpdated: q.marketTime,
    isLive: true,
  }
}

const SYMBOL_RE = /^[A-Z0-9&-]{1,20}(\.US)?$/
/** Sanitise a comma-separated ?symbols= param: valid NSE-style tickers only, de-duplicated, capped. */
export function parseSymbolsParam(raw: string | null, max = 80): string[] {
  if (!raw) return []
  return Array.from(new Set(raw.split(',').map(s => s.trim().toUpperCase()).filter(s => SYMBOL_RE.test(s)))).slice(0, max)
}
