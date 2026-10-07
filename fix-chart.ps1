# fix-chart.ps1
# Run: powershell -ExecutionPolicy Bypass -File ".\fix-chart.ps1"

Write-Host "Fixing chart loading issue..." -ForegroundColor Cyan

# ─── 1. stockStore mein allStocks add karo ───────────────────────────────────
@'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterConfig, SortConfig, PriceUpdate, Stock } from '@/types/stock'

interface StockState {
  activeFilters: FilterConfig[]
  addFilter:(f:FilterConfig)=>void
  removeFilter:(id:string)=>void
  updateFilter:(id:string,u:Partial<FilterConfig>)=>void
  clearAllFilters:()=>void
  sortConfig: SortConfig
  setSortConfig:(c:SortConfig)=>void
  selectedSymbol: string|null
  setSelectedSymbol:(s:string|null)=>void
  livePrices: Map<string,PriceUpdate>
  batchUpdatePrices:(u:Map<string,PriceUpdate>)=>void
  watchlist: Set<string>
  toggleWatchlist:(s:string)=>void
  isInWatchlist:(s:string)=>boolean
  // Global stock universe — set once, shared everywhere
  allStocks: Stock[]
  setAllStocks:(stocks:Stock[])=>void
}

export const useStockStore = create<StockState>()(
  persist(
    (set,get) => ({
      activeFilters:[],
      addFilter:(f)=>set(s=>({activeFilters:s.activeFilters.find(x=>x.id===f.id)?s.activeFilters:[...s.activeFilters,f]})),
      removeFilter:(id)=>set(s=>({activeFilters:s.activeFilters.filter(f=>f.id!==id)})),
      updateFilter:(id,u)=>set(s=>({activeFilters:s.activeFilters.map(f=>f.id===id?{...f,...u}:f)})),
      clearAllFilters:()=>set({activeFilters:[]}),
      sortConfig:{column:'marketCap',direction:'desc'},
      setSortConfig:(c)=>set({sortConfig:c}),
      selectedSymbol:null,
      setSelectedSymbol:(s)=>set({selectedSymbol:s}),
      livePrices:new Map(),
      batchUpdatePrices:(u)=>set(s=>{const m=new Map(s.livePrices);u.forEach((v,k)=>m.set(k,v));return{livePrices:m}}),
      watchlist:new Set(),
      toggleWatchlist:(s)=>set(st=>{const w=new Set(st.watchlist);w.has(s)?w.delete(s):w.add(s);return{watchlist:w}}),
      isInWatchlist:(s)=>get().watchlist.has(s),
      allStocks:[],
      setAllStocks:(stocks)=>set({allStocks:stocks}),
    }),
    {
      name:'stock-screener-v1',
      partialize:(s)=>({watchlist:Array.from(s.watchlist),sortConfig:s.sortConfig}),
      merge:(persisted:unknown,current)=>{
        const p=persisted as{watchlist?:string[];sortConfig?:SortConfig}
        return{...current,watchlist:new Set(p?.watchlist??[]),sortConfig:p?.sortConfig??current.sortConfig}
      },
    }
  )
)

export const selectActiveFilters=(s:StockState)=>s.activeFilters
export const selectSortConfig=(s:StockState)=>s.sortConfig
export const selectSelectedSymbol=(s:StockState)=>s.selectedSymbol
export const selectLivePrice=(symbol:string)=>(s:StockState)=>s.livePrices.get(symbol)
'@ | Set-Content -Path "src\stores\stockStore.ts" -Encoding UTF8
Write-Host "  [OK] stores/stockStore.ts - added allStocks" -ForegroundColor Green

# ─── 2. useFilterEngine — set allStocks in store ─────────────────────────────
@'
'use client'
import { useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useStockStore } from '@/stores/stockStore'
import { filterStocks, type FilterResult } from '@/lib/filterEngine'
import type { ApiResponse, Stock } from '@/types/stock'

async function fetchAllStocks(): Promise<Stock[]> {
  const res = await fetch('/api/stocks?pageSize=5000')
  if (!res.ok) throw new Error('Failed to fetch stocks')
  const json: ApiResponse<Stock[]> = await res.json()
  return json.data
}

export function useFilterEngine() {
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

  const stocksWithLive = useMemo(() => {
    if (livePrices.size === 0) return allStocks
    return allStocks.map(stock => {
      const live = livePrices.get(stock.symbol)
      if (!live) return stock
      return { ...stock, lastPrice: live.lastPrice, changePercent: live.changePercent, changeAbsolute: live.changeAbsolute, volume: live.volume, recentlyUpdated: true }
    })
  }, [allStocks, livePrices])

  const result = useMemo<FilterResult>(
    () => filterStocks(stocksWithLive, activeFilters, sortConfig),
    [stocksWithLive, activeFilters, sortConfig]
  )

  return {
    stocks: result.stocks,
    total: result.total,
    filteredCount: result.filteredCount,
    executionTimeMs: result.executionTimeMs,
    isLoading,
    error,
    allStocks,
  }
}
'@ | Set-Content -Path "src\hooks\useFilterEngine.ts" -Encoding UTF8
Write-Host "  [OK] hooks/useFilterEngine.ts - shares stock data" -ForegroundColor Green

# ─── 3. ChartPanel — use allStocks from store ────────────────────────────────
@'
'use client'
import React, { useEffect, useState } from 'react'
import { useStockStore } from '@/stores/stockStore'
import { StockChart } from './StockChart'
import { getOrGenerateOHLCV } from '@/lib/ohlcvGenerator'
import type { OHLCV } from '@/types/stock'

export function ChartPanel() {
  const sel       = useStockStore(s => s.selectedSymbol)
  const allStocks = useStockStore(s => s.allStocks)
  const [candles, setCandles] = useState<OHLCV[]>([])
  const [name, setName]       = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!sel || allStocks.length === 0) return

    setLoading(true)
    setCandles([])

    const stock = allStocks.find(x => x.symbol === sel)
    if (!stock) { setLoading(false); return }

    setName(stock.companyName)

    // Small timeout so UI doesnt freeze
    const t = setTimeout(() => {
      const ohlcv = getOrGenerateOHLCV(sel, stock.lastPrice)
      setCandles(ohlcv)
      setLoading(false)
    }, 50)

    return () => clearTimeout(t)
  }, [sel, allStocks])

  if (!sel) return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/>
        </svg>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">No stock selected</p>
        <p className="text-xs text-gray-400 mt-1">Click any row to view chart</p>
      </div>
    </div>
  )

  if (loading || !candles.length) return (
    <div className="flex flex-col items-center justify-center h-full gap-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      <p className="text-xs text-gray-400">Loading {sel}...</p>
    </div>
  )

  return <StockChart symbol={sel} companyName={name} candles={candles} height={500}/>
}
'@ | Set-Content -Path "src\components\Chart\ChartPanel.tsx" -Encoding UTF8
Write-Host "  [OK] components/Chart/ChartPanel.tsx - uses shared store" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Refresh browser, click any stock row." -ForegroundColor Cyan
