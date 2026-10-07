import { describe, it, expect } from 'vitest'
import { LARGE_CAP_COMPANIES, REAL_SYMBOLS, COMPANY_GROUPS, ALL_SECTORS } from '@/constants/SECTORS'
import { generateMockStocks } from '@/lib/mockDataGenerator'
import { filterStocks } from '@/lib/filterEngine'
import { toYahooSymbol } from '@/lib/realQuotes'

const sort = { column: 'symbol' as const, direction: 'asc' as const }

describe('real company universe', () => {
  it('has unique, well-formed NSE symbols', () => {
    expect(new Set(REAL_SYMBOLS).size).toBe(REAL_SYMBOLS.length)
    for (const s of REAL_SYMBOLS) expect(s).toMatch(/^[A-Z0-9&-]+$/)
  })
  it('uses valid sectors and has the major groups', () => {
    for (const c of LARGE_CAP_COMPANIES) expect(ALL_SECTORS).toContain(c.sector)
    for (const g of ['Tata', 'Reliance (Jio)', 'Aditya Birla', 'Adani']) expect(COMPANY_GROUPS).toContain(g)
  })
  it('uses post-demerger Tata Motors tickers, not the retired TATAMOTORS', () => {
    expect(REAL_SYMBOLS).toContain('TMPV'); expect(REAL_SYMBOLS).toContain('TMCV')
    expect(REAL_SYMBOLS).not.toContain('TATAMOTORS')
  })
  it('encodes symbols with & for the price feed', () => expect(toYahooSymbol('M&M')).toBe('M%26M.NS'))
})

describe('generated universe with real companies', () => {
  const stocks = generateMockStocks(5000, true)
  it('keeps 5000 rows, all real, with the 100 curated Indian companies first', () => {
    expect(stocks).toHaveLength(5000)
    expect(stocks.every(s => s.isReal && !!s.group)).toBe(true)
    const india = stocks.filter(s => s.country === 'India')
    expect(india.length).toBeGreaterThanOrEqual(REAL_SYMBOLS.length)
    expect(stocks.slice(0, REAL_SYMBOLS.length).map(s => s.symbol)).toEqual(REAL_SYMBOLS) // curated Indian companies come first
    // Indian ADRs listed in the US (e.g. HDB, IBN) keep country India but use the .US symbol, so they never clash with NSE tickers
    expect(india.filter(s => !REAL_SYMBOLS.includes(s.symbol)).every(s => s.symbol.endsWith('.US'))).toBe(true)
  })
  it('has no symbol collisions', () => expect(new Set(stocks.map(s => s.symbol)).size).toBe(5000))
  it('group filter returns exactly that group', () => {
    const r = filterStocks(stocks, [{ id: 'g', field: 'group', operator: 'eq', value: 'Tata', enabled: true, label: 'Tata' }], sort)
    const syms = r.stocks.map(s => s.symbol)
    expect(syms).toEqual(expect.arrayContaining(['TCS', 'TMPV', 'TMCV', 'TITAN', 'TATASTEEL']))
    expect(r.stocks.every(s => s.group === 'Tata')).toBe(true)
  })
  it('real-companies filter keeps every row (no placeholders)', () => {
    const r = filterStocks(stocks, [{ id: 'r', field: 'isReal', operator: 'eq', value: true, enabled: true, label: 'Real' }], sort)
    expect(r.filteredCount).toBe(5000)
  })
})

import { parseSymbolsParam } from '@/lib/realQuotes'
describe('parseSymbolsParam', () => {
  it('keeps valid tickers, drops junk, dedupes and caps', () => {
    expect(parseSymbolsParam('tcs,TCS,M&M,BAJAJ-AUTO,../etc,<script>,')).toEqual(['TCS', 'M&M', 'BAJAJ-AUTO'])
    expect(parseSymbolsParam(null)).toEqual([])
    expect(parseSymbolsParam(Array.from({ length: 200 }, (_, i) => 'S' + i).join(','))).toHaveLength(80)
  })
})

import { toYahooSymbol as toY } from '@/lib/realQuotes'
import { currencyOf, currencySign } from '@/lib/currency'
import { isUsMarketOpen } from '@/lib/marketHours'
describe('world companies', () => {
  it('maps TICKER.US to the plain Yahoo ticker and USD', () => {
    expect(toY('AAPL.US')).toBe('AAPL'); expect(toY('RELIANCE')).toBe('RELIANCE.NS')
    expect(currencyOf('AAPL.US')).toBe('USD'); expect(currencySign('TCS')).toBe('₹')
    expect(parseSymbolsParam('aapl.us,TCS,BAD.XX')).toEqual(['AAPL.US', 'TCS'])
  })
  it('US session 09:30-16:00 New York (Mon 2026-10-05)', () => {
    expect(isUsMarketOpen(new Date('2026-10-05T14:00:00Z'))).toBe(true)   // 10:00 EDT
    expect(isUsMarketOpen(new Date('2026-10-05T13:00:00Z'))).toBe(false)  // 09:00 EDT
    expect(isUsMarketOpen(new Date('2026-10-03T15:00:00Z'))).toBe(false)  // Saturday
  })
})

import { parseUsFull } from '../../../scripts/sync-nse-companies.mjs'
describe('sync script: world list parser', () => {
  const rows = [
    { symbol: 'AAPL', name: 'Apple Inc. Common Stock', marketCap: '4858256580200.00', sector: 'Technology', country: 'United States' },
    { symbol: 'BRK/B', name: 'Berkshire Hathaway Inc. Class B', marketCap: '1000000000', sector: 'Finance', country: 'United States' },
    { symbol: 'TSM', name: 'Taiwan Semiconductor Manufacturing Company Ltd. American Depositary Shares', marketCap: '900000000000', sector: 'Technology', country: 'Taiwan' },
    { symbol: 'ABCDW', name: 'Abc Corp Warrant', marketCap: '5000000', sector: 'Finance', country: 'China' },
    { symbol: 'NOCAP', name: 'No Market Cap Inc', marketCap: '', sector: '', country: '' },
    { symbol: 'AAIC^B', name: 'Preferred thing', marketCap: '100', sector: '', country: '' },
  ]
  it('keeps real operating companies, cleans names, drops warrants/no-cap/odd tickers', () => {
    const out = parseUsFull(rows)
    expect(out.map((r: { s: string }) => r.s)).toEqual(['AAPL', 'BRK-B', 'TSM'])
    expect(out[0]).toEqual({ s: 'AAPL', n: 'Apple Inc.', m: 4858256580200, k: 'Technology', c: 'United States' })
    expect(out[2].n).toBe('Taiwan Semiconductor Manufacturing Company Ltd.')
  })
})
