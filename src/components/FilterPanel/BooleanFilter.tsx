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
