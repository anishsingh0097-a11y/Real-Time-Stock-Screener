'use client'
import React from 'react'
import { useRealtimePolling, type ConnectionStatus } from '@/hooks/useRealtimePolling'
import { useStockStore } from '@/stores/stockStore'

export function ConnectionStatus() {
  const status = useRealtimePolling()
  const market = useStockStore(s => s.marketStatus)

  const cfg: Record<ConnectionStatus, { color: string; bg: string; pulse: boolean; label: string }> = {
    connecting:   { color: 'text-yellow-500', bg: 'bg-yellow-500', pulse: false, label: 'Connecting' },
    connected:    { color: 'text-green-500',  bg: 'bg-green-500',  pulse: true,  label: 'Live' },
    reconnecting: { color: 'text-orange-500', bg: 'bg-orange-500', pulse: false, label: 'Reconnecting' },
    disconnected: { color: 'text-red-500',    bg: 'bg-red-500',    pulse: false, label: 'Offline' },
  }

  let { color, bg, pulse, label } = cfg[status]
  let title = 'Real NSE prices (Yahoo Finance); other stocks are simulated'
  if (status === 'connected' && market) {
    if (!market.open) {
      color = 'text-gray-500'; bg = 'bg-gray-400'; pulse = false; label = 'Markets closed'
      title = 'NSE (Mon-Fri 9:15-15:30 IST) and US markets are closed - showing last traded prices'
    } else if (market.liveCount === 0) {
      color = 'text-orange-500'; bg = 'bg-orange-500'; pulse = false; label = 'No live feed'
      title = 'Market is open but the price feed returned no data'
    } else {
      label = `Live · ${market.liveCount}${market.realTotal?`/${market.realTotal}`:''} real`
    }
  }

  return (
    <span title={title} className={`flex items-center gap-1.5 text-xs font-medium ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${bg} ${pulse ? 'animate-pulse' : ''}`} />
      {label}
    </span>
  )
}
