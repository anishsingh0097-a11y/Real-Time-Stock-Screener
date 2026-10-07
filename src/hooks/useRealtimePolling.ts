'use client'
import { useEffect, useRef, useCallback, useState } from 'react'
import { useStockStore } from '@/stores/stockStore'
import { visibleSymbols } from '@/lib/visibleSymbols'
import type { PriceUpdate } from '@/types/stock'
import type { MarketStatus } from '@/stores/stockStore'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

const POLL_INTERVAL = 2000  // 2 seconds - realistic market tick
const MAX_RETRIES = 5

export function useRealtimePolling(onStatus?: (s: ConnectionStatus) => void) {
  const batchUpdate = useStockStore(s => s.batchUpdatePrices)
  const setMarketStatus = useStockStore(s => s.setMarketStatus)
  const [status, setStatus] = useState<ConnectionStatus>('connecting')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryCount = useRef(0)
  const rafRef = useRef<number | null>(null)
  const pendingRef = useRef<Map<string, PriceUpdate>>(new Map())
  const mounted = useRef(true)

  const flushUpdates = useCallback(() => {
    if (pendingRef.current.size > 0) {
      batchUpdate(new Map(pendingRef.current))
      pendingRef.current.clear()
    }
    rafRef.current = null
  }, [batchUpdate])

  const updateStatus = useCallback((s: ConnectionStatus) => {
    setStatus(s)
    onStatus?.(s)
  }, [onStatus])

  const poll = useCallback(async () => {
    if (!mounted.current) return

    try {
      const res = await fetch(`/api/ws?symbols=${encodeURIComponent(visibleSymbols.current.slice(0, 60).join(','))}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      const data: { updates: PriceUpdate[]; market?: MarketStatus } = await res.json()
      if (data.market) setMarketStatus(data.market)

      // Buffer updates and flush via RAF for smooth rendering
      data.updates.forEach(u => pendingRef.current.set(u.symbol, u))
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(flushUpdates)
      }

      retryCount.current = 0
      if (status !== 'connected') updateStatus('connected')

      // Schedule next poll
      timerRef.current = setTimeout(poll, POLL_INTERVAL)

    } catch {
      retryCount.current++
      if (retryCount.current >= MAX_RETRIES) {
        updateStatus('disconnected')
        return
      }
      updateStatus('reconnecting')
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, retryCount.current), 16000)
      timerRef.current = setTimeout(poll, delay)
    }
  }, [flushUpdates, updateStatus, status, setMarketStatus])

  useEffect(() => {
    mounted.current = true
    updateStatus('connecting')

    // Start polling after short delay
    timerRef.current = setTimeout(poll, 500)

    return () => {
      mounted.current = false
      if (timerRef.current) clearTimeout(timerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  return status
}
