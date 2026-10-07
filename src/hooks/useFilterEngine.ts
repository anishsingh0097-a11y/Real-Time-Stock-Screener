'use client'
import { useMemo, useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStockStore } from '@/stores/stockStore'
import { filterStocks, type FilterResult } from '@/lib/filterEngine'
import { searchStocks } from '@/lib/search'
import type { ApiResponse, Stock } from '@/types/stock'

const RECENT_WINDOW_MS = 5000

async function fetchAllStocks(): Promise<Stock[]> {
  const res = await fetch('/api/stocks?pageSize=5000')
  if (!res.ok) throw new Error('Failed to fetch stocks')
  const json: ApiResponse<Stock[]> = await res.json()
  return json.data
}

export function useFilterEngine(query = '') {
  const activeFilters = useStockStore(s => s.activeFilters)
  const sortConfig    = useStockStore(s => s.sortConfig)
  const livePrices    = useStockStore(s => s.livePrices)
  const setAllStocks  = useStockStore(s => s.setAllStocks)

  const { data: allStocks = [], isLoading, error } = useQuery({
    queryKey: ['stocks', 'universe'],
    queryFn: fetchAllStocks,
    staleTime: 5 * 60 * 1000,
  })

  // Store in global store so ChartPanel can access same data
  useEffect(() => {
    if (allStocks.length > 0) setAllStocks(allStocks)
  }, [allStocks, setAllStocks])

  // Clock tick so `recentlyUpdated` can expire (5s window) even when no new ticks arrive
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (livePrices.size === 0) return
    const id = setInterval(() => setNow(Date.now()), RECENT_WINDOW_MS)
    return () => clearInterval(id)
  }, [livePrices.size > 0])

  const stocksWithLive = useMemo(() => {
    if (livePrices.size === 0) return allStocks
    return allStocks.map(stock => {
      const live = livePrices.get(stock.symbol)
      if (!live) return stock
      return { ...stock, lastPrice: live.lastPrice, changePercent: live.changePercent, changeAbsolute: live.changeAbsolute, volume: live.volume, recentlyUpdated: now - live.timestamp <= RECENT_WINDOW_MS, isLive: stock.isLive || live.source === 'live' }
    })
  }, [allStocks, livePrices, now])

  // While a search is typed it covers ALL companies (column filters are paused), still using the current sort
  const q = query.trim()
  const result = useMemo<FilterResult>(
    () => q ? filterStocks(searchStocks(stocksWithLive, q), [], sortConfig) : filterStocks(stocksWithLive, activeFilters, sortConfig),
    [stocksWithLive, activeFilters, sortConfig, q]
  )

  return {
    stocks: result.stocks,
    total: stocksWithLive.length,
    filteredCount: result.filteredCount,
    executionTimeMs: result.executionTimeMs,
    isLoading,
    error,
    allStocks,
  }
}
