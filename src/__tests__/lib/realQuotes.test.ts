import { describe, it, expect, beforeEach, vi } from 'vitest'
import { parseChartResponse, toYahooSymbol, fetchRealQuotes, applyRealQuote, __resetRealQuoteCache } from '@/lib/realQuotes'
import { isNseMarketOpen } from '@/lib/marketHours'
import { generateMockStock } from '@/test-utils/mockData'

const chart = (meta: Record<string, unknown>) => ({ chart: { result: [{ meta }], error: null } })
const goodMeta = { regularMarketPrice: 2950.456, chartPreviousClose: 2900, regularMarketVolume: 1234567, regularMarketDayHigh: 2960, regularMarketDayLow: 2890.5, fiftyTwoWeekHigh: 3200, fiftyTwoWeekLow: 2200, regularMarketTime: 1_700_000_000 }
const okResponse = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response

beforeEach(() => __resetRealQuoteCache())

describe('toYahooSymbol', () => {
  it('appends .NS and encodes special characters', () => {
    expect(toYahooSymbol('RELIANCE')).toBe('RELIANCE.NS')
    expect(toYahooSymbol('M&M')).toBe('M%26M.NS')
  })
})

describe('parseChartResponse', () => {
  it('computes price, change and change% from price vs previous close', () => {
    const q = parseChartResponse('RELIANCE', chart(goodMeta))!
    expect(q.lastPrice).toBe(2950.46)
    expect(q.changeAbsolute).toBe(50.46)
    expect(q.changePercent).toBe(1.74)
    expect(q.volume).toBe(1234567)
    expect(q.dayHigh).toBe(2960)
    expect(q.marketTime).toBe(1_700_000_000_000)
  })
  it('returns null for missing/invalid data', () => {
    expect(parseChartResponse('X', null)).toBeNull()
    expect(parseChartResponse('X', { chart: { result: null, error: { code: 'Not Found' } } })).toBeNull()
    expect(parseChartResponse('X', chart({ regularMarketPrice: 0, chartPreviousClose: 10 }))).toBeNull()
    expect(parseChartResponse('X', chart({ regularMarketPrice: 10 }))).toBeNull()
    expect(parseChartResponse('X', chart({ regularMarketPrice: 'abc', chartPreviousClose: 10 }))).toBeNull()
  })
})

describe('fetchRealQuotes', () => {
  it('fetches each symbol once, omits failures, and caches within the TTL', async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const u = String(url)
      if (u.includes('BADCO.NS')) return { ok: false, status: 404 } as Response
      return okResponse(chart(goodMeta))
    }) as unknown as typeof fetch
    const r1 = await fetchRealQuotes(['RELIANCE', 'BADCO'], { fetchImpl })
    expect(Array.from(r1.keys())).toEqual(['RELIANCE'])
    expect(fetchImpl).toHaveBeenCalledTimes(2)
    await fetchRealQuotes(['RELIANCE', 'BADCO'], { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledTimes(2) // served from cache (success AND recent failure)
  })
  it('refetches after the TTL expires', async () => {
    let t = 1000
    const fetchImpl = vi.fn(async () => okResponse(chart(goodMeta))) as unknown as typeof fetch
    await fetchRealQuotes(['TCS'], { fetchImpl, now: () => t, ttlMs: 8000 })
    t += 9000
    await fetchRealQuotes(['TCS'], { fetchImpl, now: () => t, ttlMs: 8000 })
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })
  it('survives network errors and timeouts (returns empty map)', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down') }) as unknown as typeof fetch
    const r = await fetchRealQuotes(['INFY'], { fetchImpl })
    expect(r.size).toBe(0)
  })
  it('de-duplicates concurrent identical requests', async () => {
    const fetchImpl = vi.fn(async () => okResponse(chart(goodMeta))) as unknown as typeof fetch
    await Promise.all([fetchRealQuotes(['ITC'], { fetchImpl }), fetchRealQuotes(['ITC'], { fetchImpl })])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('applyRealQuote', () => {
  it('overlays price fields, marks isLive, keeps fundamentals', () => {
    const stock = generateMockStock({ symbol: 'RELIANCE', pe: 22, roe: 18, lastPrice: 1000 })
    const q = parseChartResponse('RELIANCE', chart(goodMeta))!
    const out = applyRealQuote(stock, q)
    expect(out.lastPrice).toBe(2950.46)
    expect(out.isLive).toBe(true)
    expect(out.week52High).toBe(3200)
    expect(out.pe).toBe(22)
    expect(out.roe).toBe(18)
  })
})

describe('isNseMarketOpen (IST 09:15-15:30, Mon-Fri)', () => {
  const ist = (iso: string) => new Date(iso + '+05:30')
  it('open during session', () => expect(isNseMarketOpen(ist('2026-10-05T10:00:00'))).toBe(true)) // Monday
  it('closed before open / at close', () => {
    expect(isNseMarketOpen(ist('2026-10-05T09:14:00'))).toBe(false)
    expect(isNseMarketOpen(ist('2026-10-05T15:30:00'))).toBe(false)
    expect(isNseMarketOpen(ist('2026-10-05T09:15:00'))).toBe(true)
  })
  it('closed on weekends', () => expect(isNseMarketOpen(ist('2026-10-03T11:00:00'))).toBe(false)) // Saturday
})
