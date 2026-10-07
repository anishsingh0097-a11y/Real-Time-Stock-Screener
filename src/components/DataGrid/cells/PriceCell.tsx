'use client'
import React, { memo, useEffect, useRef, useState } from 'react'
import { formatPrice } from '@/utils/formatters'
import { currencyOf } from '@/lib/currency'
import { useStockStore } from '@/stores/stockStore'

interface Props { symbol: string; basePrice: number }

export const PriceCell = memo(function PriceCell({ symbol, basePrice }: Props) {
  const livePrice = useStockStore(s => s.livePrices.get(symbol))
  const price = livePrice?.lastPrice ?? basePrice
  const prevRef = useRef(price)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (price === prevRef.current) return
    const dir = price > prevRef.current ? 'up' : 'down'
    setFlash(dir)
    prevRef.current = price
    const t = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(t)
  }, [price])

  return (
    <span
      className={`font-mono tabular-nums text-sm transition-colors duration-300 ${
        flash === 'up'   ? 'text-green-400 bg-green-500/20 rounded px-1' :
        flash === 'down' ? 'text-red-400 bg-red-500/20 rounded px-1' :
        'text-gray-900 dark:text-gray-100'
      }`}
    >
      {formatPrice(price, currencyOf(symbol))}
    </span>
  )
}, (prev, next) => prev.symbol === next.symbol && prev.basePrice === next.basePrice)
