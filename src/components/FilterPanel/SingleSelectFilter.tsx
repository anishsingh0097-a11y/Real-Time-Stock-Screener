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
