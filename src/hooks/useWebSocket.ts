'use client'
import { useEffect, useRef, useCallback } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { PriceUpdate } from '@/types/stock'
const DELAYS=[1000,2000,4000,8000,16000]
export type WSStatus='connecting'|'connected'|'reconnecting'|'disconnected'
export function useRealtimeUpdates(onStatus?:(s:WSStatus)=>void){
  const wsRef=useRef<WebSocket|null>(null)
  const attempt=useRef(0), timer=useRef<ReturnType<typeof setTimeout>|null>(null)
  const rafId=useRef<number|null>(null), pending=useRef<Map<string,PriceUpdate>>(new Map())
  const batchUpdate=useStockStore(s=>s.batchUpdatePrices)
  const mounted=useRef(true)
  const flush=useCallback(()=>{
    if(pending.current.size>0){batchUpdate(new Map(pending.current));pending.current.clear()}
    rafId.current=null
  },[batchUpdate])
  const connect=useCallback(()=>{
    if(!mounted.current) return
    onStatus?.('connecting')
    try{
      const ws=new WebSocket(process.env.NEXT_PUBLIC_WS_URL||'ws://localhost:3001')
      ws.onopen=()=>{if(!mounted.current){ws.close();return};attempt.current=0;onStatus?.('connected')}
      ws.onmessage=(e:MessageEvent)=>{
        try{const d:PriceUpdate=JSON.parse(e.data as string);pending.current.set(d.symbol,d);if(!rafId.current)rafId.current=requestAnimationFrame(flush)}catch{}
      }
      ws.onclose=()=>{
        if(!mounted.current)return
        const delay=DELAYS[Math.min(attempt.current,DELAYS.length-1)]!
        attempt.current++;onStatus?.('reconnecting')
        timer.current=setTimeout(connect,delay)
      }
      ws.onerror=()=>{onStatus?.('disconnected');ws.close()}
      wsRef.current=ws
    }catch{onStatus?.('disconnected')}
  },[flush,onStatus])
  useEffect(()=>{
    mounted.current=true;connect()
    return()=>{mounted.current=false;if(rafId.current)cancelAnimationFrame(rafId.current);if(timer.current)clearTimeout(timer.current);wsRef.current?.close();wsRef.current=null}
  },[connect])
}
