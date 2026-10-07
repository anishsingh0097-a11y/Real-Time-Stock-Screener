'use client'
import React, { useState } from 'react'
import { DataGrid } from '@/components/DataGrid/DataGrid'
import { FilterPanel } from '@/components/FilterPanel/FilterPanel'
import { ChartPanel } from '@/components/Chart/ChartPanel'
import { ConnectionStatus } from '@/components/ConnectionStatus'
import { MarketPulse } from '@/components/MarketPulse'
import { DarkModeToggle } from '@/components/ui/DarkModeToggle'
import { SearchBar } from '@/components/SearchBar'
import { useFilterEngine } from '@/hooks/useFilterEngine'
import { exportToCSV } from '@/utils/exportCSV'

export default function ScreenerPage() {
  const [collapsed, setCollapsed] = useState(false)
  const [showChart, setShowChart] = useState(false)
  const [query, setQuery] = useState('')
  const { stocks, filteredCount, total, isLoading, error } = useFilterEngine(query)

  if (error) return (
    <div className="flex items-center justify-center h-screen text-red-500">
      Error: {(error as Error).message}
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-gray-950 transition-colors duration-200">

      <FilterPanel
        filteredCount={filteredCount}
        totalCount={total}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(c => !c)}
      />

      <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white grid place-items-center text-sm font-bold" aria-hidden>₹</div>
            <div>
              <h1 className="text-base font-semibold leading-tight text-gray-900 dark:text-white">Stock Screener</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <span className="font-semibold text-gray-800 dark:text-gray-200">{filteredCount.toLocaleString('en-IN')}</span> of {total.toLocaleString('en-IN')} stocks match
              </p>
            </div>
          </div>
          <SearchBar value={query} onChange={setQuery} resultCount={filteredCount} />
          <div className="flex items-center gap-2">
            <ConnectionStatus />
            <div className="flex rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-0.5">
              <button onClick={() => setShowChart(c => !c)} aria-pressed={showChart}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${showChart ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>
                Chart
              </button>
              <button onClick={() => exportToCSV(stocks, `screener-${Date.now()}.csv`)}
                className="px-3 py-1 text-xs font-medium rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                Export CSV
              </button>
            </div>
            <DarkModeToggle />
          </div>
        </div>

        <MarketPulse stocks={stocks} />

        {/* Grid + Chart */}
        <div className="flex-1 overflow-hidden flex gap-2 min-h-0">
          <div className={showChart ? 'w-[58%] overflow-hidden' : 'flex-1 overflow-hidden'}>
            <DataGrid data={stocks} isLoading={isLoading} />
          </div>
          {showChart && (
            <div className="w-[42%] overflow-hidden">
              <ChartPanel />
            </div>
          )}
        </div>

      </main>
    </div>
  )
}


