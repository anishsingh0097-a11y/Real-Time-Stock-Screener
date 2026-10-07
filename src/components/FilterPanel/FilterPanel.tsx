'use client'
import React, { useState, useCallback, useMemo } from 'react'
import { useStockStore } from '@/stores/stockStore'
import { RangeFilter } from './RangeFilter'
import { MultiSelectFilter } from './MultiSelectFilter'
import { SingleSelectFilter } from './SingleSelectFilter'
import { BooleanFilter } from './BooleanFilter'
import { FILTER_PRESETS } from '@/constants/FILTER_PRESETS'
import { COMPANY_GROUPS } from '@/constants/SECTORS'
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
          <span className={`text-gray-400 text-xs transition-transform duration-200 ${open?'rotate-180':''}`}>v</span>
        </div>
      </button>
      {open&&<div className="px-4 pb-4 space-y-4">{children}</div>}
    </div>
  )
}
interface Props{filteredCount:number;totalCount:number;collapsed?:boolean;onToggleCollapse?:()=>void}
export function FilterPanel({filteredCount,totalCount,collapsed=false,onToggleCollapse}:Props){
  const activeFilters=useStockStore(s=>s.activeFilters)
  const allStocks=useStockStore(s=>s.allStocks)
  // Countries present in the data, most companies first (India always shown first)
  const countries=useMemo(()=>{const n=new Map<string,number>();for(const s of allStocks)if(s.country)n.set(s.country,(n.get(s.country)??0)+1);return Array.from(n.keys()).sort((a,b)=>a==='India'?-1:b==='India'?1:(n.get(b)??0)-(n.get(a)??0))},[allStocks])
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
        <Accordion title="Classification" count={countSec(['country','group','sector','marketCapCategory','indexMembership'])}>
 <MultiSelectFilter id="c-cty" label="Country" field="country" options={countries}/>
 <MultiSelectFilter id="c-grp" label="Company Group" field="group" options={[...COMPANY_GROUPS,'Other listed','World']}/>
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
        <Accordion title="Custom" count={countSec(['recentlyUpdated','isLive'])}>
          <BooleanFilter id="cu-live" label="Real NSE prices only" field="isLive" description="Real market data (others are simulated)"/>
          <BooleanFilter id="cu-ru" label="Recently Updated" field="recentlyUpdated" description="Price tick received in last 5s"/>
        </Accordion>
      </div>
    </div>
  )
}


