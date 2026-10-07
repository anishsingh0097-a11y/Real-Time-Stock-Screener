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
