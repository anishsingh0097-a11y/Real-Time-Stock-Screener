'use client'
import React, { memo } from 'react'
import { useStockStore } from '@/stores/stockStore'
import { formatChangePercent } from '@/utils/formatters'

interface Props { symbol: string; baseChange: number }

export const ChangeCell = memo(function ChangeCell({ symbol, baseChange }: Props) {
  const livePrice = useStockStore(s => s.livePrices.get(symbol))
  const change = livePrice?.changePercent ?? baseChange
  const isUp = change >= 0

  return (
    <span className={`font-mono tabular-nums text-sm font-medium ${
      isUp ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'
    }`}>
      {isUp ? '+' : ''}{change.toFixed(2)}%
    </span>
  )
}, (prev, next) => prev.symbol === next.symbol && prev.baseChange === next.baseChange)
