'use client'
import React, { useMemo } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { Stock } from '@/types/stock'

const fmt = (n: number) => `${n > 0 ? '+' : ''}${n.toFixed(2)}%`

function Mover({ s, onPick }: { s: Stock; onPick: (sym: string) => void }) {
  const up = s.changePercent >= 0
  return (
    <button onClick={() => onPick(s.symbol)} title={s.companyName}
      className="flex items-baseline gap-1.5 px-2 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors whitespace-nowrap">
      <span className="text-xs font-semibold text-gray-800 dark:text-gray-100">{s.symbol}</span>
      <span className={`text-xs font-medium ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{fmt(s.changePercent)}</span>
    </button>
  )
}

/** Breadth bar (how many stocks are up vs down) + top movers of the current list. */
export function MarketPulse({ stocks }: { stocks: Stock[] }) {
  const pick = useStockStore(s => s.setSelectedSymbol)
  const { up, down, gainers, losers } = useMemo(() => {
    const sorted = [...stocks].sort((a, b) => b.changePercent - a.changePercent)
    return {
      up: stocks.filter(s => s.changePercent > 0).length,
      down: stocks.filter(s => s.changePercent < 0).length,
      gainers: sorted.slice(0, 5),
      losers: sorted.slice(-5).reverse(),
    }
  }, [stocks])
  const total = up + down || 1

  return (
    <div className="flex items-center gap-4 flex-shrink-0 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
      <div className="w-56 flex-shrink-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">{up.toLocaleString('en-IN')} up</span>
          <span className="font-semibold text-rose-600 dark:text-rose-400">{down.toLocaleString('en-IN')} down</span>
        </div>
        <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-800" role="img" aria-label={`${up} stocks up, ${down} down`}>
          <div className="bg-emerald-500 transition-[width] duration-700" style={{ width: `${(up / total) * 100}%` }} />
          <div className="bg-rose-500 flex-1" />
        </div>
      </div>
      <div className="h-8 w-px bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
      <div className="flex-1 min-w-0 overflow-x-auto flex items-center gap-0.5" aria-label="Top movers">
        {gainers.map(s => <Mover key={s.symbol} s={s} onPick={pick} />)}
        <span className="w-px h-4 bg-gray-200 dark:bg-gray-800 mx-1.5 flex-shrink-0" />
        {losers.map(s => <Mover key={s.symbol} s={s} onPick={pick} />)}
      </div>
    </div>
  )
}
