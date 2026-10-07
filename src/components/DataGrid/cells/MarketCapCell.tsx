'use client'
import React, { memo } from 'react'
import { formatMarketCap } from '@/utils/formatters'
export const MarketCapCell = memo(function MarketCapCell({ value }: { value: number }) {
  return (
    <span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">
      Rs.{formatMarketCap(value)}
    </span>
  )
})
