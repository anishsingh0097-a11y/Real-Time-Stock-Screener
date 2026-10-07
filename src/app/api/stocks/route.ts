import { NextResponse } from 'next/server'
import { generateMockStocks } from '@/lib/mockDataGenerator'
import { fetchRealQuotes, applyRealQuote } from '@/lib/realQuotes'
import { REAL_SYMBOLS } from '@/constants/SECTORS'
import type { ApiResponse, Stock } from '@/types/stock'

export const dynamic = 'force-dynamic'
let cacheTs = 0

export async function GET(request: Request): Promise<NextResponse<ApiResponse<Stock[]>>> {
  const start = performance.now()
  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const pageSize = parseInt(searchParams.get('pageSize') ?? '5000', 10)
  const force = Date.now() - cacheTs > 300000
  if (force) cacheTs = Date.now()
  const base = generateMockStocks(5000, force)

  // Overlay real market prices on the real symbols so the first paint already shows real data
  const quotes = await fetchRealQuotes(REAL_SYMBOLS)
  const all = quotes.size === 0 ? base : base.map(s => { const q = quotes.get(s.symbol); return q ? applyRealQuote(s, q) : s })

  const si = (page - 1) * pageSize
  return NextResponse.json({
    success: true, data: all.slice(si, si + pageSize),
    meta: { total: all.length, page, pageSize, timestamp: new Date().toISOString(), executionTimeMs: Math.round(performance.now() - start) },
  })
}
