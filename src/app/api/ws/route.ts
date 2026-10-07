// Price tick endpoint - polled by the client every 2s.
//  * REAL symbols (REAL_SYMBOLS) -> real NSE prices from the live feed (see lib/realQuotes.ts)
//  * synthetic placeholder stocks -> simulated random walk (they have no real market price);
//    set SIMULATE_SYNTHETIC=false to stop simulating them.
import { NextResponse } from 'next/server'
import { generateMockStocks } from '@/lib/mockDataGenerator'
import { fetchRealQuotes, parseSymbolsParam } from '@/lib/realQuotes'
import { isNseMarketOpen, isUsMarketOpen } from '@/lib/marketHours'
import { REAL_SYMBOLS } from '@/constants/SECTORS'
import type { PriceUpdate } from '@/types/stock'

// Without this Next.js can pre-render GET() at build time and serve a frozen response in production.
export const dynamic = 'force-dynamic'

export interface MarketInfo { open: boolean; asOf: number | null; liveCount: number; realTotal: number; source: 'yahoo' }
export interface TickResponse { updates: PriceUpdate[]; market: MarketInfo }

function gaussianRandom(): number {
  const u = Math.random() || 1e-10
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random())
}

function simulatePrice(price: number, volatility: number): number {
  return Math.max(0.01, price * (1 + volatility * gaussianRandom() * Math.sqrt(1 / 252)))
}

// In-memory price state for simulated stocks (resets on server restart)
const priceState = new Map<string, number>()
const realSet = new Set(REAL_SYMBOLS)

export async function GET(request: Request): Promise<NextResponse<TickResponse>> {
  const updates: PriceUpdate[] = []

  // 1) real prices: curated companies + whatever rows are visible in the client's grid
  const visible = parseSymbolsParam(new URL(request.url).searchParams.get('symbols'))
  const wanted = Array.from(new Set([...REAL_SYMBOLS, ...visible]))
  const quotes = await fetchRealQuotes(wanted)
  let asOf: number | null = null
  quotes.forEach(q => {
    asOf = asOf === null ? q.marketTime : Math.max(asOf, q.marketTime)
    updates.push({
      symbol: q.symbol, lastPrice: q.lastPrice, changePercent: q.changePercent,
      changeAbsolute: q.changeAbsolute, volume: q.volume, timestamp: Date.now(), source: 'live',
    })
  })

  // 2) simulated movement for synthetic placeholder stocks only
  if (process.env.SIMULATE_SYNTHETIC !== 'false') {
    const stocks = generateMockStocks(5000)
    if (priceState.size === 0) stocks.forEach(s => priceState.set(s.symbol, s.lastPrice))
    const synthetic = stocks.filter(s => !s.isReal && !realSet.has(s.symbol))
    const picked = [...synthetic].sort(() => Math.random() - 0.5).slice(0, 50)
    for (const stock of picked) {
      const current = priceState.get(stock.symbol) ?? stock.lastPrice
      const next = simulatePrice(current, stock.beta * 0.02)
      const abs = next - stock.lastPrice
      priceState.set(stock.symbol, next)
      updates.push({
        symbol: stock.symbol, lastPrice: Math.round(next * 100) / 100,
        changePercent: Math.round((abs / stock.lastPrice) * 10000) / 100,
        changeAbsolute: Math.round(abs * 100) / 100,
        volume: Math.round(Math.abs(gaussianRandom()) * 500000 + 50000),
        timestamp: Date.now(), source: 'sim',
      })
    }
  }

  return NextResponse.json({
    updates,
    market: { open: isNseMarketOpen() || isUsMarketOpen(), asOf, liveCount: quotes.size, realTotal: wanted.length, source: 'yahoo' },
  })
}
