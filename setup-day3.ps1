# setup-day3.ps1
# Run from: D:\Real-Time Stock Screener\stock-screener
# Usage: powershell -ExecutionPolicy Bypass -File ".\setup-day3.ps1"

Write-Host "Creating Day 3 files..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force -Path "src/hooks","src/constants","src/components/FilterPanel","src/__tests__/filters" | Out-Null

# ─── lib/filterEngine.ts ─────────────────────────────────────────────────────
@'
import type { Stock, FilterConfig, SortConfig } from '@/types/stock'
type Predicate = (stock: Stock) => boolean
function buildPredicate(filter: FilterConfig): Predicate {
  const { field, operator, value } = filter
  return (stock: Stock): boolean => {
    const v = stock[field]
    if (v === null || v === undefined) return operator === 'eq' && value === null
    switch (operator) {
      case 'eq':   return v === value
      case 'neq':  return v !== value
      case 'gt':   return typeof v === 'number' && typeof value === 'number' && v > value
      case 'gte':  return typeof v === 'number' && typeof value === 'number' && v >= value
      case 'lt':   return typeof v === 'number' && typeof value === 'number' && v < value
      case 'lte':  return typeof v === 'number' && typeof value === 'number' && v <= value
      case 'between': {
        if (!Array.isArray(value) || value.length < 2) return true
        const [mn, mx] = value as number[]
        return typeof v === 'number' && v >= (mn ?? -Infinity) && v <= (mx ?? Infinity)
      }
      case 'in': {
        const arr = value as (string|number)[]
        if (!Array.isArray(arr) || arr.length === 0) return true
        if (Array.isArray(v)) return (v as string[]).some(x => arr.includes(x))
        return arr.includes(v as string|number)
      }
      case 'notIn': {
        const arr = value as (string|number)[]
        if (!Array.isArray(arr) || arr.length === 0) return true
        return !arr.includes(v as string|number)
      }
      default: return true
    }
  }
}
function selectivity(f: FilterConfig): number {
  switch (f.operator) {
    case 'between': case 'gt': case 'gte': case 'lt': case 'lte': return 1
    case 'eq': return 2
    case 'in': return 3 + (Array.isArray(f.value) ? (f.value as unknown[]).length : 5)
    case 'notIn': return 4
    default: return 10
  }
}
function stableSort(stocks: Stock[], cfg: SortConfig): Stock[] {
  const m = cfg.direction === 'asc' ? 1 : -1
  return [...stocks].sort((a, b) => {
    const av = a[cfg.column], bv = b[cfg.column]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * m
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * m
    return 0
  })
}
export interface FilterResult { stocks: Stock[]; total: number; filteredCount: number; executionTimeMs: number }
export function filterStocks(allStocks: Stock[], filters: FilterConfig[], sortConfig: SortConfig): FilterResult {
  const start = performance.now()
  const active = filters.filter(f => f.enabled)
  let result: Stock[]
  if (active.length === 0) {
    result = stableSort(allStocks, sortConfig)
  } else {
    const sorted = [...active].sort((a, b) => selectivity(a) - selectivity(b))
    const preds = sorted.map(f => buildPredicate(f))
    const filtered: Stock[] = []
    for (const stock of allStocks) {
      let pass = true
      for (const pred of preds) { if (!pred(stock)) { pass = false; break } }
      if (pass) filtered.push(stock)
    }
    result = stableSort(filtered, sortConfig)
  }
  return { stocks: result, total: allStocks.length, filteredCount: result.length, executionTimeMs: performance.now() - start }
}
export function countMatching(allStocks: Stock[], filters: FilterConfig[]): number {
  const active = filters.filter(f => f.enabled)
  if (active.length === 0) return allStocks.length
  const preds = active.map(f => buildPredicate(f))
  return allStocks.filter(s => preds.every(p => p(s))).length
}
'@ | Set-Content -Path "src\lib\filterEngine.ts" -Encoding UTF8
Write-Host "  [OK] lib/filterEngine.ts" -ForegroundColor Green

# ─── constants/FILTER_PRESETS.ts ─────────────────────────────────────────────
@'
import type { FilterPreset } from '@/types/stock'
export const FILTER_PRESETS: FilterPreset[] = [
  { id:'value-stocks', name:'Value Stocks', description:'Low PE, high ROE, low debt', filters:[
    {id:'vs-pe',field:'pe',operator:'between',value:[1,15],enabled:true,label:'P/E 1-15'},
    {id:'vs-roe',field:'roe',operator:'gte',value:15,enabled:true,label:'ROE >= 15%'},
    {id:'vs-de',field:'debtToEquity',operator:'lte',value:0.5,enabled:true,label:'D/E <= 0.5'},
    {id:'vs-div',field:'dividendYield',operator:'gte',value:2,enabled:true,label:'Div >= 2%'},
  ]},
  { id:'growth-momentum', name:'Growth Momentum', description:'High growth, RSI momentum', filters:[
    {id:'gm-rg',field:'revenueGrowthYoY',operator:'gte',value:20,enabled:true,label:'Rev Growth >= 20%'},
    {id:'gm-pg',field:'profitGrowthYoY',operator:'gte',value:20,enabled:true,label:'PAT Growth >= 20%'},
    {id:'gm-rsi',field:'rsi14',operator:'between',value:[40,70],enabled:true,label:'RSI 40-70'},
    {id:'gm-mac',field:'macdSignal',operator:'eq',value:'Bullish',enabled:true,label:'MACD Bullish'},
  ]},
  { id:'large-cap-quality', name:'Large Cap Quality', description:'Blue chip fundamentals', filters:[
    {id:'lq-mc',field:'marketCap',operator:'gte',value:20000,enabled:true,label:'MCap >= 20K Cr'},
    {id:'lq-roc',field:'roce',operator:'gte',value:15,enabled:true,label:'ROCE >= 15%'},
    {id:'lq-pro',field:'promoterHolding',operator:'gte',value:50,enabled:true,label:'Promoter >= 50%'},
    {id:'lq-cat',field:'marketCapCategory',operator:'eq',value:'Large Cap',enabled:true,label:'Large Cap'},
  ]},
  { id:'technical-breakout', name:'Technical Breakout', description:'Price breakout with volume', filters:[
    {id:'tb-rsi',field:'rsi14',operator:'between',value:[50,70],enabled:true,label:'RSI 50-70'},
    {id:'tb-vol',field:'volumeVsAvg',operator:'in',value:['2x','3x','Above'],enabled:true,label:'High Volume'},
    {id:'tb-mac',field:'macdSignal',operator:'eq',value:'Bullish',enabled:true,label:'MACD Bullish'},
    {id:'tb-bol',field:'bollingerPosition',operator:'eq',value:'Within',enabled:true,label:'Within Bands'},
  ]},
  { id:'high-dividend', name:'High Dividend', description:'Consistent high yield', filters:[
    {id:'hd-div',field:'dividendYield',operator:'gte',value:3,enabled:true,label:'Div >= 3%'},
    {id:'hd-pe',field:'pe',operator:'between',value:[1,25],enabled:true,label:'PE 1-25'},
    {id:'hd-de',field:'debtToEquity',operator:'lte',value:1.0,enabled:true,label:'D/E <= 1'},
  ]},
  { id:'it-sector', name:'IT Sector', description:'Quality IT companies', filters:[
    {id:'it-sec',field:'sector',operator:'eq',value:'IT',enabled:true,label:'IT Sector'},
    {id:'it-roe',field:'roe',operator:'gte',value:15,enabled:true,label:'ROE >= 15%'},
    {id:'it-de',field:'debtToEquity',operator:'lte',value:0.3,enabled:true,label:'D/E <= 0.3'},
  ]},
]
export const PRESET_MAP = Object.fromEntries(FILTER_PRESETS.map(p => [p.id, p]))
'@ | Set-Content -Path "src\constants\FILTER_PRESETS.ts" -Encoding UTF8
Write-Host "  [OK] constants/FILTER_PRESETS.ts" -ForegroundColor Green

# ─── hooks/useFilterEngine.ts ─────────────────────────────────────────────────
@'
'use client'
import { useMemo } from 'react'
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
  const { data: allStocks = [], isLoading, error } = useQuery({
    queryKey: ['stocks', 'universe'],
    queryFn: fetchAllStocks,
    staleTime: 5 * 60 * 1000,
  })
  const stocksWithLive = useMemo(() => {
    if (livePrices.size === 0) return allStocks
    return allStocks.map(stock => {
      const live = livePrices.get(stock.symbol)
      if (!live) return stock
      return { ...stock, lastPrice: live.lastPrice, changePercent: live.changePercent, changeAbsolute: live.changeAbsolute, volume: live.volume, recentlyUpdated: true }
    })
  }, [allStocks, livePrices])
  const result = useMemo<FilterResult>(() => filterStocks(stocksWithLive, activeFilters, sortConfig), [stocksWithLive, activeFilters, sortConfig])
  return { stocks: result.stocks, total: result.total, filteredCount: result.filteredCount, executionTimeMs: result.executionTimeMs, isLoading, error, allStocks }
}
'@ | Set-Content -Path "src\hooks\useFilterEngine.ts" -Encoding UTF8
Write-Host "  [OK] hooks/useFilterEngine.ts" -ForegroundColor Green

# ─── components/FilterPanel/RangeFilter.tsx ───────────────────────────────────
@'
'use client'
import React, { useState, useCallback, useId } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { FilterConfig, Stock } from '@/types/stock'
interface Props { id:string; label:string; field:keyof Stock; min:number; max:number; step?:number; unit?:string }
export function RangeFilter({ id, label, field, min, max, step=1, unit='' }: Props) {
  const addFilter=useStockStore(s=>s.addFilter), removeFilter=useStockStore(s=>s.removeFilter)
  const existing=useStockStore(s=>s.activeFilters.find(f=>f.id===id))
  const [minVal,setMinVal]=useState(existing?String((existing.value as number[])[0]??min):String(min))
  const [maxVal,setMaxVal]=useState(existing?String((existing.value as number[])[1]??max):String(max))
  const [active,setActive]=useState(!!existing)
  const uid=useId()
  const apply=useCallback((mn:string,mx:string)=>{
    const mnN=parseFloat(mn),mxN=parseFloat(mx)
    if(isNaN(mnN)&&isNaN(mxN)){removeFilter(id);setActive(false);return}
    addFilter({id,field,operator:'between',value:[isNaN(mnN)?min:mnN,isNaN(mxN)?max:mxN],enabled:true,label:`${label}: ${mn}-${mx}${unit}`})
    setActive(true)
  },[id,field,label,unit,min,max,addFilter,removeFilter])
  const clear=useCallback(()=>{setMinVal(String(min));setMaxVal(String(max));removeFilter(id);setActive(false)},[id,min,max,removeFilter])
  const inputCls="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 tabular-nums"
  return(
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
        {active&&<button onClick={clear} className="text-xs text-blue-500 hover:text-blue-700">Clear</button>}
      </div>
      <div className="flex items-center gap-2">
        <input type="number" id={`${uid}-min`} aria-label={`${label} min`} value={minVal} min={min} max={max} step={step}
          onChange={e=>setMinVal(e.target.value)} onBlur={()=>apply(minVal,maxVal)} onKeyDown={e=>e.key==='Enter'&&apply(minVal,maxVal)}
          placeholder={String(min)} className={inputCls}/>
        <span className="text-xs text-gray-400 shrink-0">to</span>
        <input type="number" id={`${uid}-max`} aria-label={`${label} max`} value={maxVal} min={min} max={max} step={step}
          onChange={e=>setMaxVal(e.target.value)} onBlur={()=>apply(minVal,maxVal)} onKeyDown={e=>e.key==='Enter'&&apply(minVal,maxVal)}
          placeholder={String(max)} className={inputCls}/>
      </div>
    </div>
  )
}
'@ | Set-Content -Path "src\components\FilterPanel\RangeFilter.tsx" -Encoding UTF8
Write-Host "  [OK] FilterPanel/RangeFilter.tsx" -ForegroundColor Green

# ─── components/FilterPanel/MultiSelectFilter.tsx ────────────────────────────
@'
'use client'
import React, { useState, useCallback, useId } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { FilterConfig, Stock } from '@/types/stock'
interface Props { id:string; label:string; field:keyof Stock; options:string[] }
export function MultiSelectFilter({ id, label, field, options }: Props) {
  const addFilter=useStockStore(s=>s.addFilter),removeFilter=useStockStore(s=>s.removeFilter)
  const existing=useStockStore(s=>s.activeFilters.find(f=>f.id===id))
  const sel=new Set<string>(existing?(existing.value as string[]):[])
  const [search,setSearch]=useState('')
  const uid=useId()
  const toggle=useCallback((opt:string)=>{
    const next=new Set(sel);next.has(opt)?next.delete(opt):next.add(opt)
    if(next.size===0){removeFilter(id);return}
    const arr=Array.from(next)
    addFilter({id,field,operator:'in',value:arr,enabled:true,label:`${label}: ${arr.join(', ')}`})
  },[id,field,label,sel,addFilter,removeFilter])
  const filtered=options.filter(o=>o.toLowerCase().includes(search.toLowerCase()))
  return(
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={uid} className="text-xs font-medium text-gray-700 dark:text-gray-300">
          {label}{sel.size>0&&<span className="ml-1.5 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full">{sel.size}</span>}
        </label>
        {sel.size>0&&<button onClick={()=>removeFilter(id)} className="text-xs text-blue-500 hover:text-blue-700">Clear</button>}
      </div>
      {options.length>6&&<input id={uid} type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}
        aria-label={`Search ${label}`} className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"/>}
      <div className="space-y-1 max-h-40 overflow-y-auto pr-1" aria-live="polite">
        {filtered.map(opt=>(
          <label key={opt} className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 px-1 py-0.5 rounded">
            <input type="checkbox" checked={sel.has(opt)} onChange={()=>toggle(opt)} aria-label={opt}
              className="w-3.5 h-3.5 rounded border-gray-300 dark:border-gray-600 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"/>
            <span className={`text-xs ${sel.has(opt)?'text-blue-600 dark:text-blue-400 font-medium':'text-gray-700 dark:text-gray-300'}`}>{opt}</span>
          </label>
        ))}
        {filtered.length===0&&<p className="text-xs text-gray-400 py-2 text-center">No results</p>}
      </div>
    </div>
  )
}
'@ | Set-Content -Path "src\components\FilterPanel\MultiSelectFilter.tsx" -Encoding UTF8
Write-Host "  [OK] FilterPanel/MultiSelectFilter.tsx" -ForegroundColor Green

# ─── components/FilterPanel/SingleSelectFilter.tsx ───────────────────────────
@'
'use client'
import React, { useCallback, useId } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { FilterConfig, Stock } from '@/types/stock'
interface Props { id:string; label:string; field:keyof Stock; options:string[] }
export function SingleSelectFilter({ id, label, field, options }: Props) {
  const addFilter=useStockStore(s=>s.addFilter),removeFilter=useStockStore(s=>s.removeFilter)
  const existing=useStockStore(s=>s.activeFilters.find(f=>f.id===id))
  const uid=useId()
  const select=useCallback((opt:string)=>{
    if(opt===''){removeFilter(id);return}
    addFilter({id,field,operator:'eq',value:opt,enabled:true,label:`${label}: ${opt}`})
  },[id,field,label,addFilter,removeFilter])
  return(
    <div className="space-y-2">
      <label htmlFor={uid} className="text-xs font-medium text-gray-700 dark:text-gray-300 block">{label}</label>
      <select id={uid} value={existing?String(existing.value):''} onChange={e=>select(e.target.value)} aria-label={label}
        className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
        <option value="">All</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}
'@ | Set-Content -Path "src\components\FilterPanel\SingleSelectFilter.tsx" -Encoding UTF8
Write-Host "  [OK] FilterPanel/SingleSelectFilter.tsx" -ForegroundColor Green

# ─── components/FilterPanel/BooleanFilter.tsx ────────────────────────────────
@'
'use client'
import React, { useCallback, useId } from 'react'
import { useStockStore } from '@/stores/stockStore'
import type { FilterConfig, Stock } from '@/types/stock'
interface Props { id:string; label:string; field:keyof Stock; description?:string }
export function BooleanFilter({ id, label, field, description }: Props) {
  const addFilter=useStockStore(s=>s.addFilter),removeFilter=useStockStore(s=>s.removeFilter)
  const active=!!useStockStore(s=>s.activeFilters.find(f=>f.id===id))
  const uid=useId()
  const toggle=useCallback(()=>{
    if(active)removeFilter(id)
    else addFilter({id,field,operator:'eq',value:true,enabled:true,label})
  },[active,id,field,label,addFilter,removeFilter])
  return(
    <div className="flex items-center justify-between gap-3 py-0.5">
      <div className="flex-1 min-w-0">
        <label htmlFor={uid} className="text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer block truncate">{label}</label>
        {description&&<p className="text-xs text-gray-400 truncate">{description}</p>}
      </div>
      <button id={uid} role="switch" aria-checked={active} aria-label={label} onClick={toggle}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 shrink-0 ${active?'bg-blue-500':'bg-gray-300 dark:bg-gray-600'}`}>
        <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${active?'translate-x-4':'translate-x-0.5'}`}/>
      </button>
    </div>
  )
}
'@ | Set-Content -Path "src\components\FilterPanel\BooleanFilter.tsx" -Encoding UTF8
Write-Host "  [OK] FilterPanel/BooleanFilter.tsx" -ForegroundColor Green

# ─── components/FilterPanel/FilterPanel.tsx ──────────────────────────────────
@'
'use client'
import React, { useState, useCallback } from 'react'
import { useStockStore } from '@/stores/stockStore'
import { RangeFilter } from './RangeFilter'
import { MultiSelectFilter } from './MultiSelectFilter'
import { SingleSelectFilter } from './SingleSelectFilter'
import { BooleanFilter } from './BooleanFilter'
import { FILTER_PRESETS } from '@/constants/FILTER_PRESETS'
const SECTORS=['IT','Banking','Pharma','Auto','FMCG','Metal','Energy','Realty','Telecom','Infrastructure','Media','Chemicals','Others']
const CAP_CATS=['Large Cap','Mid Cap','Small Cap','Micro Cap']
const INDICES=['NIFTY 50','NIFTY Next 50','NIFTY Midcap 100','NIFTY Smallcap 250','BSE Sensex']
function Accordion({title,count,children,defaultOpen=false}:{title:string;count?:number;children:React.ReactNode;defaultOpen?:boolean}){
  const[open,setOpen]=useState(defaultOpen)
  return(
    <div className="border-b border-gray-100 dark:border-gray-800">
      <button onClick={()=>setOpen(o=>!o)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors" aria-expanded={open}>
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">{title}</span>
        <div className="flex items-center gap-2">
          {(count??0)>0&&<span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full font-medium">{count}</span>}
          <span className={`text-gray-400 text-xs transition-transform duration-200 ${open?'rotate-180':''}`}>▼</span>
        </div>
      </button>
      {open&&<div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  )
}
interface Props{filteredCount:number;totalCount:number;collapsed?:boolean;onToggleCollapse?:()=>void}
export function FilterPanel({filteredCount,totalCount,collapsed=false,onToggleCollapse}:Props){
  const activeFilters=useStockStore(s=>s.activeFilters)
  const addFilter=useStockStore(s=>s.addFilter)
  const removeFilter=useStockStore(s=>s.removeFilter)
  const clearAllFilters=useStockStore(s=>s.clearAllFilters)
  const activeCount=activeFilters.filter(f=>f.enabled).length
  const countSec=(fields:string[])=>activeFilters.filter(f=>fields.includes(String(f.field))).length
  const applyPreset=useCallback((pid:string)=>{
    clearAllFilters()
    FILTER_PRESETS.find(p=>p.id===pid)?.filters.forEach(f=>addFilter(f))
  },[clearAllFilters,addFilter])
  if(collapsed)return(
    <div className="w-12 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center py-4 gap-3 flex-shrink-0">
      <button onClick={onToggleCollapse} title="Expand filters" className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h18M3 12h12"/></svg>
      </button>
      {activeCount>0&&<span className="w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">{activeCount}</span>}
    </div>
  )
  return(
    <div className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col overflow-hidden flex-shrink-0">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60">
        <div className="flex items-center gap-2">
          <button onClick={onToggleCollapse} title="Collapse" className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7M21 12H4"/></svg>
          </button>
          <span className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wide">Filters</span>
          {activeCount>0&&<span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full font-medium">{activeCount}</span>}
        </div>
        {activeCount>0&&<button onClick={clearAllFilters} className="text-xs text-red-500 hover:text-red-700 font-medium" aria-label="Clear all filters">Clear all</button>}
      </div>
      <div className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/40" role="status" aria-live="polite" aria-atomic="true">
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
          Showing <span className="font-bold text-blue-900 dark:text-blue-100">{filteredCount.toLocaleString('en-IN')}</span> of {totalCount.toLocaleString('en-IN')} stocks
        </p>
      </div>
      {activeFilters.length>0&&(
        <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-800 flex flex-wrap gap-1.5" role="region" aria-label="Active filters" aria-live="polite">
          {activeFilters.map(f=>(
            <span key={f.id} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 rounded-full max-w-[200px]">
              <span className="truncate">{f.label??f.field}</span>
              <button onClick={()=>removeFilter(f.id)} aria-label={`Remove ${f.label??f.field}`} className="shrink-0 text-blue-400 hover:text-blue-600 ml-0.5">x</button>
            </span>
          ))}
        </div>
      )}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Quick Screeners</p>
        <div className="flex flex-wrap gap-1.5">
          {FILTER_PRESETS.map(p=>(
            <button key={p.id} onClick={()=>applyPreset(p.id)} title={p.description}
              className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 transition-colors font-medium">
              {p.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <Accordion title="Fundamentals" count={countSec(['pe','pb','dividendYield','eps','roe','roce','debtToEquity','currentRatio','promoterHolding','revenueGrowthYoY','profitGrowthYoY','marketCap'])} defaultOpen>
          <RangeFilter id="f-mc"  label="Market Cap (Cr)"        field="marketCap"         min={50}   max={2000000} step={100} unit=" Cr"/>
          <RangeFilter id="f-pe"  label="P/E Ratio"              field="pe"                min={-100} max={500}     step={0.5}/>
          <RangeFilter id="f-pb"  label="P/B Ratio"              field="pb"                min={0}    max={100}     step={0.1}/>
          <RangeFilter id="f-dy"  label="Dividend Yield (%)"     field="dividendYield"     min={0}    max={25}      step={0.1} unit="%"/>
          <RangeFilter id="f-eps" label="EPS (Rs)"               field="eps"               min={-500} max={5000}    step={1}/>
          <RangeFilter id="f-roe" label="ROE (%)"                field="roe"               min={-100} max={200}     step={1}   unit="%"/>
          <RangeFilter id="f-roc" label="ROCE (%)"               field="roce"              min={-100} max={200}     step={1}   unit="%"/>
          <RangeFilter id="f-de"  label="Debt / Equity"          field="debtToEquity"      min={0}    max={10}      step={0.1}/>
          <RangeFilter id="f-cr"  label="Current Ratio"          field="currentRatio"      min={0}    max={20}      step={0.1}/>
          <RangeFilter id="f-ph"  label="Promoter Holding (%)"   field="promoterHolding"   min={0}    max={100}     step={1}   unit="%"/>
          <RangeFilter id="f-rg"  label="Revenue Growth YoY (%)" field="revenueGrowthYoY" min={-100} max={500}     step={1}   unit="%"/>
          <RangeFilter id="f-pg"  label="Profit Growth YoY (%)"  field="profitGrowthYoY"  min={-100} max={1000}    step={1}   unit="%"/>
        </Accordion>
        <Accordion title="Market Data" count={countSec(['lastPrice','week52High','week52Low','avgVolume20D','beta','changePercent'])}>
          <RangeFilter id="m-ltp"  label="Last Price (Rs)"       field="lastPrice"    min={0}    max={500000}    step={10}/>
          <RangeFilter id="m-52h"  label="52W High (Rs)"         field="week52High"   min={0}    max={500000}    step={10}/>
          <RangeFilter id="m-52l"  label="52W Low (Rs)"          field="week52Low"    min={0}    max={500000}    step={10}/>
          <RangeFilter id="m-vol"  label="Avg Volume (20D)"      field="avgVolume20D" min={0}    max={100000000} step={10000}/>
          <RangeFilter id="m-beta" label="Beta"                  field="beta"         min={-2}   max={5}         step={0.1}/>
          <RangeFilter id="m-chg"  label="Day Change (%)"        field="changePercent" min={-20} max={20}        step={0.1} unit="%"/>
        </Accordion>
        <Accordion title="Classification" count={countSec(['sector','marketCapCategory','indexMembership'])}>
          <MultiSelectFilter id="c-sec" label="Sector"           field="sector"            options={SECTORS}/>
          <MultiSelectFilter id="c-cap" label="Market Cap Cat."  field="marketCapCategory" options={CAP_CATS}/>
          <MultiSelectFilter id="c-idx" label="Index Membership" field="indexMembership"   options={INDICES}/>
        </Accordion>
        <Accordion title="Technical" count={countSec(['rsi14','macdSignal','bollingerPosition','atr','volumeVsAvg'])}>
          <RangeFilter id="t-rsi" label="RSI (14)"            field="rsi14"            min={0} max={100} step={1}/>
          <SingleSelectFilter id="t-mac" label="MACD Signal"          field="macdSignal"       options={['Bullish','Bearish','Neutral']}/>
          <SingleSelectFilter id="t-bol" label="Bollinger Band Pos."  field="bollingerPosition" options={['Above','Within','Below']}/>
          <SingleSelectFilter id="t-vva" label="Volume vs 20D Avg"    field="volumeVsAvg"      options={['3x','2x','Above','Below']}/>
          <RangeFilter id="t-atr" label="ATR"                 field="atr"              min={0} max={500} step={1}/>
        </Accordion>
        <Accordion title="Custom" count={countSec(['recentlyUpdated'])}>
          <BooleanFilter id="cu-ru" label="Recently Updated" field="recentlyUpdated" description="Updated via WebSocket in last 5s"/>
        </Accordion>
      </div>
    </div>
  )
}
'@ | Set-Content -Path "src\components\FilterPanel\FilterPanel.tsx" -Encoding UTF8
Write-Host "  [OK] FilterPanel/FilterPanel.tsx" -ForegroundColor Green

# ─── app/screener/page.tsx (updated) ─────────────────────────────────────────
@'
'use client'
import React, { useState } from 'react'
import { DataGrid } from '@/components/DataGrid/DataGrid'
import { FilterPanel } from '@/components/FilterPanel/FilterPanel'
import { useFilterEngine } from '@/hooks/useFilterEngine'
export default function ScreenerPage() {
  const[collapsed,setCollapsed]=useState(false)
  const{stocks,filteredCount,total,executionTimeMs,isLoading,error}=useFilterEngine()
  if(error)return<div className="flex items-center justify-center h-screen text-red-500">Error: {(error as Error).message}</div>
  return(
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
      <FilterPanel filteredCount={filteredCount} totalCount={total} collapsed={collapsed} onToggleCollapse={()=>setCollapsed(c=>!c)}/>
      <main className="flex-1 flex flex-col overflow-hidden p-3 gap-2 min-w-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">Stock Screener</h1>
            <p className="text-xs text-gray-500">NSE / BSE {executionTimeMs>0&&<>• <span className={executionTimeMs<200?'text-green-600':'text-orange-500'}>{executionTimeMs.toFixed(1)}ms</span></>}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400"><span className="font-semibold text-gray-900 dark:text-white">{filteredCount.toLocaleString('en-IN')}</span> stocks</span>
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Live</span>
          </div>
        </div>
        <div className="flex-1 overflow-hidden"><DataGrid data={stocks} isLoading={isLoading}/></div>
      </main>
      <aside className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 hidden xl:flex items-center justify-center">
        <p className="text-xs text-gray-400">Chart panel — Day 4</p>
      </aside>
    </div>
  )
}
'@ | Set-Content -Path "src\app\screener\page.tsx" -Encoding UTF8
Write-Host "  [OK] app/screener/page.tsx" -ForegroundColor Green

# ─── __tests__/filters/filterEngine.test.ts ──────────────────────────────────
@'
import { describe, it, expect } from 'vitest'
import { filterStocks } from '@/lib/filterEngine'
import { generateMockStock, generateMockStockList } from '@/test-utils/mockData'
const SORT = { column: 'marketCap' as const, direction: 'desc' as const }
describe('Filter Engine - Operators', () => {
  it('gte filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20}),generateMockStock({symbol:'B',roe:10}),generateMockStock({symbol:'C',roe:15})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'roe',operator:'gte',value:15,enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('lte filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',debtToEquity:0.2}),generateMockStock({symbol:'B',debtToEquity:1.5}),generateMockStock({symbol:'C',debtToEquity:0.5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'debtToEquity',operator:'lte',value:0.5,enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('between filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',rsi14:25}),generateMockStock({symbol:'B',rsi14:55}),generateMockStock({symbol:'C',rsi14:75})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'rsi14',operator:'between',value:[30,70],enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('eq filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',sector:'IT'}),generateMockStock({symbol:'B',sector:'Banking'}),generateMockStock({symbol:'C',sector:'IT'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'sector',operator:'eq',value:'IT',enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('in filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',sector:'IT'}),generateMockStock({symbol:'B',sector:'Banking'}),generateMockStock({symbol:'C',sector:'Pharma'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'sector',operator:'in',value:['IT','Banking'],enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','B'])
  })
  it('notIn filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',macdSignal:'Bullish'}),generateMockStock({symbol:'B',macdSignal:'Bearish'}),generateMockStock({symbol:'C',macdSignal:'Neutral'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'macdSignal',operator:'notIn',value:['Bearish'],enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('gt filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',marketCap:5000}),generateMockStock({symbol:'B',marketCap:10000})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'marketCap',operator:'gt',value:5000,enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('lt filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',beta:0.8}),generateMockStock({symbol:'B',beta:1.5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'beta',operator:'lt',value:1.0,enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['A'])
  })
})
describe('Filter Engine - Combinatorial', () => {
  it('applies AND logic across multiple filters', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20,debtToEquity:0.2,sector:'IT'}),generateMockStock({symbol:'B',roe:20,debtToEquity:1.5,sector:'IT'}),generateMockStock({symbol:'C',roe:10,debtToEquity:0.2,sector:'IT'}),generateMockStock({symbol:'D',roe:20,debtToEquity:0.2,sector:'Banking'})]
    const filters=[{id:'1',field:'roe' as const,operator:'gte' as const,value:15,enabled:true},{id:'2',field:'debtToEquity' as const,operator:'lte' as const,value:0.5,enabled:true},{id:'3',field:'sector' as const,operator:'eq' as const,value:'IT',enabled:true}]
    const{stocks:r}=filterStocks(stocks,filters,SORT)
    expect(r.map(s=>s.symbol)).toEqual(['A'])
  })
  it('disabled filters are ignored', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20}),generateMockStock({symbol:'B',roe:5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'roe',operator:'gte',value:15,enabled:false}],SORT)
    expect(r).toHaveLength(2)
  })
  it('empty filters return all stocks', () => {
    const stocks=generateMockStockList(50)
    const{stocks:r}=filterStocks(stocks,[],SORT)
    expect(r).toHaveLength(50)
  })
  it('null pe handled gracefully', () => {
    const stocks=[generateMockStock({symbol:'A',pe:null}),generateMockStock({symbol:'B',pe:20})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'pe',operator:'between',value:[1,30],enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('filteredCount equals result length', () => {
    const stocks=generateMockStockList(200)
    const{stocks:r,filteredCount}=filterStocks(stocks,[{id:'1',field:'rsi14' as const,operator:'between' as const,value:[30,70],enabled:true}],SORT)
    expect(r.length).toBe(filteredCount)
  })
})
describe('Filter Engine - Performance', () => {
  it('filters 5000 stocks in under 200ms', () => {
    const stocks=generateMockStockList(5000)
    const filters=[{id:'1',field:'marketCap' as const,operator:'gte' as const,value:1000,enabled:true},{id:'2',field:'pe' as const,operator:'between' as const,value:[10,30],enabled:true},{id:'3',field:'roe' as const,operator:'gte' as const,value:12,enabled:true},{id:'4',field:'sector' as const,operator:'in' as const,value:['IT','Banking','Pharma'],enabled:true},{id:'5',field:'debtToEquity' as const,operator:'lte' as const,value:2,enabled:true}]
    const start=performance.now()
    const{executionTimeMs}=filterStocks(stocks,filters,SORT)
    expect(performance.now()-start).toBeLessThan(200)
    expect(executionTimeMs).toBeLessThan(200)
  })
})
describe('Filter Engine - Sort', () => {
  it('sorts descending by marketCap', () => {
    const stocks=[generateMockStock({symbol:'A',marketCap:1000}),generateMockStock({symbol:'B',marketCap:5000}),generateMockStock({symbol:'C',marketCap:3000})]
    const{stocks:r}=filterStocks(stocks,[],{column:'marketCap',direction:'desc'})
    expect(r.map(s=>s.marketCap)).toEqual([5000,3000,1000])
  })
  it('sorts ascending by lastPrice', () => {
    const stocks=[generateMockStock({symbol:'A',lastPrice:500}),generateMockStock({symbol:'B',lastPrice:100}),generateMockStock({symbol:'C',lastPrice:300})]
    const{stocks:r}=filterStocks(stocks,[],{column:'lastPrice',direction:'asc'})
    expect(r.map(s=>s.lastPrice)).toEqual([100,300,500])
  })
  it('nulls go last', () => {
    const stocks=[generateMockStock({symbol:'A',pe:null}),generateMockStock({symbol:'B',pe:20}),generateMockStock({symbol:'C',pe:10})]
    const{stocks:r}=filterStocks(stocks,[],{column:'pe',direction:'asc'})
    expect(r[r.length-1]?.pe).toBeNull()
  })
})
'@ | Set-Content -Path "src\__tests__\filters\filterEngine.test.ts" -Encoding UTF8
Write-Host "  [OK] __tests__/filters/filterEngine.test.ts" -ForegroundColor Green

Write-Host ""
Write-Host "Day 3 complete! Run: npm run dev" -ForegroundColor Cyan
Write-Host "Then test: npm test" -ForegroundColor Cyan
