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
