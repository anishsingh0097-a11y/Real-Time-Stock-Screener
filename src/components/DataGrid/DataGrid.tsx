'use client'
import React,{useRef,useMemo,useCallback}from 'react'
import{useReactTable,getCoreRowModel,getSortedRowModel,flexRender,type SortingState,type ColumnPinningState}from '@tanstack/react-table'
import{useVirtualizer}from '@tanstack/react-virtual'
import{visibleSymbols}from '@/lib/visibleSymbols'
import type{Stock}from '@/types/stock'
import{stockColumns}from './columns'
import{useStockStore}from '@/stores/stockStore'
const ROW_HEIGHT=36,OVERSCAN=12
interface Props{data:Stock[];isLoading?:boolean}
export function DataGrid({data,isLoading=false}:Props){
  const ref=useRef<HTMLDivElement>(null)
  const sortConfig=useStockStore(s=>s.sortConfig)
  const setSortConfig=useStockStore(s=>s.setSortConfig)
  const selectedSymbol=useStockStore(s=>s.selectedSymbol)
  const setSelectedSymbol=useStockStore(s=>s.setSelectedSymbol)
  const sorting=useMemo<SortingState>(()=>[{id:sortConfig.column as string,desc:sortConfig.direction==='desc'}],[sortConfig])
  const pinning=useMemo<ColumnPinningState>(()=>({left:['symbol']}),[])
  const table=useReactTable({data,columns:stockColumns,state:{sorting,columnPinning:pinning},onSortingChange:(u)=>{const n=typeof u==='function'?u(sorting):u;if(n[0])setSortConfig({column:n[0].id as keyof Stock,direction:n[0].desc?'desc':'asc'})},getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),enableColumnPinning:true})
  const rows=table.getRowModel().rows
  const virt=useVirtualizer({count:rows.length,getScrollElement:()=>ref.current,estimateSize:()=>ROW_HEIGHT,overscan:OVERSCAN})
  const vrows=virt.getVirtualItems()
  visibleSymbols.current=vrows.map(v=>rows[v.index]?.original.symbol).filter((s):s is string=>!!s)
  const onRow=useCallback((s:string)=>setSelectedSymbol(s),[setSelectedSymbol])
  if(isLoading)return<div className="flex items-center justify-center h-full text-gray-400"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/><span className="text-sm">Loading 5,000 stocks...</span></div></div>
  return(
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs text-gray-500 dark:text-gray-400">Showing <span className="font-semibold text-gray-900 dark:text-white">{rows.length.toLocaleString('en-IN')}</span> stocks</span>
        <span className="text-xs text-gray-400">Sorted by <span className="font-medium">{sortConfig.column}</span> ({sortConfig.direction})</span>
      </div>
      <div ref={ref} className="flex-1 overflow-auto" role="grid" aria-label="Stock Screener Results" aria-rowcount={rows.length}>
        <div style={{minWidth:table.getTotalSize()}}>
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            {table.getHeaderGroups().map(hg=>(
              <div key={hg.id} className="flex" role="row">
                {hg.headers.map((h,hi)=>{
                  const pinned=h.column.getIsPinned(),sorted=h.column.getIsSorted()
                  return(
                    <div key={h.id} role="columnheader" aria-colindex={hi+1} aria-sort={sorted==='asc'?'ascending':sorted==='desc'?'descending':'none'} style={{width:h.getSize()}} className={['flex items-center px-3 h-9 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none shrink-0',h.column.getCanSort()?'cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors':'',pinned==='left'?'sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-[2px_0_4px_rgba(0,0,0,0.08)]':''].join(' ')} onClick={h.column.getToggleSortingHandler()} tabIndex={h.column.getCanSort()?0:-1} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();h.column.getToggleSortingHandler()?.(e)}}}>
                      {flexRender(h.column.columnDef.header,h.getContext())}
                      {sorted==='asc'&&<span className="ml-1 text-blue-500">ASC</span>}
                      {sorted==='desc'&&<span className="ml-1 text-blue-500">DESC</span>}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
          <div style={{height:virt.getTotalSize(),position:'relative'}}>
            {vrows.map(vr=>{
              const row=rows[vr.index];if(!row)return null
              const sel=row.original.symbol===selectedSymbol,even=vr.index%2===0
              return(
                <div key={row.id} role="row" aria-rowindex={vr.index+2} style={{position:'absolute',top:vr.start,height:ROW_HEIGHT,width:'100%'}} className={['flex items-center border-b border-gray-100 dark:border-gray-800/60 cursor-pointer transition-colors duration-150',sel?'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500':even?'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50':'bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/50'].join(' ')} onClick={()=>onRow(row.original.symbol)}>
                  {row.getVisibleCells().map((cell,ci)=>{
                    const pinned=cell.column.getIsPinned()
                    return(
                      <div key={cell.id} role="gridcell" aria-colindex={ci+1} tabIndex={-1} style={{width:cell.column.getSize()}} className={['flex items-center px-3 shrink-0 overflow-hidden',pinned==='left'?['sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]',sel?'bg-blue-50 dark:bg-blue-900/20':even?'bg-white dark:bg-gray-900':'bg-gray-50/50 dark:bg-gray-800/20'].join(' '):''].join(' ')}>
                        {flexRender(cell.column.columnDef.cell,cell.getContext())}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
