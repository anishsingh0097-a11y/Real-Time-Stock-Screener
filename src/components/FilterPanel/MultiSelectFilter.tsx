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
