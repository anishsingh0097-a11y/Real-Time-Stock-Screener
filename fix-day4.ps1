# fix-day4.ps1
# Run: powershell -ExecutionPolicy Bypass -File ".\fix-day4.ps1"

Write-Host "Fixing encoding + chart issues..." -ForegroundColor Cyan

# ─── Fix DataGrid.tsx — replace sort arrows with ASCII ───────────────────────
@'
'use client'
import React,{useRef,useMemo,useCallback}from 'react'
import{useReactTable,getCoreRowModel,getSortedRowModel,flexRender,type SortingState,type ColumnPinningState}from '@tanstack/react-table'
import{useVirtualizer}from '@tanstack/react-virtual'
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
  const table=useReactTable({data,columns:stockColumns,state:{sorting,columnPinning:pinning},
    onSortingChange:(u)=>{const n=typeof u==='function'?u(sorting):u;if(n[0])setSortConfig({column:n[0].id as keyof Stock,direction:n[0].desc?'desc':'asc'})},
    getCoreRowModel:getCoreRowModel(),getSortedRowModel:getSortedRowModel(),enableColumnPinning:true})
  const rows=table.getRowModel().rows
  const virt=useVirtualizer({count:rows.length,getScrollElement:()=>ref.current,estimateSize:()=>ROW_HEIGHT,overscan:OVERSCAN})
  const vrows=virt.getVirtualItems()
  const onRow=useCallback((s:string)=>setSelectedSymbol(s),[setSelectedSymbol])
  if(isLoading)return(
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
        <span className="text-sm">Loading 5,000 stocks...</span>
      </div>
    </div>
  )
  return(
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Showing <span className="font-semibold text-gray-900 dark:text-white">{rows.length.toLocaleString('en-IN')}</span> stocks
        </span>
        <span className="text-xs text-gray-400">
          Sorted by <span className="font-medium">{sortConfig.column}</span> {sortConfig.direction==='desc'?'(desc)':'(asc)'}
        </span>
      </div>
      <div ref={ref} className="flex-1 overflow-auto" role="grid" aria-label="Stock Screener Results" aria-rowcount={rows.length}>
        <div style={{minWidth:table.getTotalSize()}}>
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            {table.getHeaderGroups().map(hg=>(
              <div key={hg.id} className="flex" role="row">
                {hg.headers.map((h,hi)=>{
                  const pinned=h.column.getIsPinned(),sorted=h.column.getIsSorted()
                  return(
                    <div key={h.id} role="columnheader" aria-colindex={hi+1}
                      aria-sort={sorted==='asc'?'ascending':sorted==='desc'?'descending':'none'}
                      style={{width:h.getSize()}}
                      className={[
                        'flex items-center px-3 h-9 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none shrink-0',
                        h.column.getCanSort()?'cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors':'',
                        pinned==='left'?'sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-[2px_0_4px_rgba(0,0,0,0.08)]':'',
                      ].join(' ')}
                      onClick={h.column.getToggleSortingHandler()}
                      tabIndex={h.column.getCanSort()?0:-1}
                      onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();h.column.getToggleSortingHandler()?.(e)}}}>
                      {flexRender(h.column.columnDef.header,h.getContext())}
                      {sorted==='asc'&&<span className="ml-1 text-blue-500">▲</span>}
                      {sorted==='desc'&&<span className="ml-1 text-blue-500">▼</span>}
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
                <div key={row.id} role="row" aria-rowindex={vr.index+2}
                  style={{position:'absolute',top:vr.start,height:ROW_HEIGHT,width:'100%'}}
                  className={[
                    'flex items-center border-b border-gray-100 dark:border-gray-800/60 cursor-pointer transition-colors duration-150',
                    sel?'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500':
                    even?'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50':
                    'bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/50',
                  ].join(' ')}
                  onClick={()=>onRow(row.original.symbol)}>
                  {row.getVisibleCells().map((cell,ci)=>{
                    const pinned=cell.column.getIsPinned()
                    return(
                      <div key={cell.id} role="gridcell" aria-colindex={ci+1} tabIndex={-1}
                        style={{width:cell.column.getSize()}}
                        className={[
                          'flex items-center px-3 shrink-0 overflow-hidden',
                          pinned==='left'?[
                            'sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]',
                            sel?'bg-blue-50 dark:bg-blue-900/20':
                            even?'bg-white dark:bg-gray-900':
                            'bg-gray-50/50 dark:bg-gray-800/20',
                          ].join(' '):'',
                        ].join(' ')}>
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
'@ | Set-Content -Path "src\components\DataGrid\DataGrid.tsx" -Encoding UTF8
Write-Host "  [OK] DataGrid.tsx fixed" -ForegroundColor Green

# ─── Fix columns.tsx — remove arrow chars ────────────────────────────────────
@'
'use client'
import React from 'react'
import{createColumnHelper}from '@tanstack/react-table'
import type{Stock}from '@/types/stock'
import{PriceCell}from './cells/PriceCell'
import{ChangeCell}from './cells/ChangeCell'
import{VolumeCell}from './cells/VolumeCell'
import{MarketCapCell}from './cells/MarketCapCell'
import{RSICell}from './cells/RSICell'
import{formatPE,formatDecimal}from '@/utils/formatters'
const col=createColumnHelper<Stock>()
const CAP_COLORS:Record<string,string>={
  'Large Cap':'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30',
  'Mid Cap':'text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30',
  'Small Cap':'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30',
  'Micro Cap':'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800',
}
export const stockColumns=[
  col.accessor('symbol',{header:'Symbol',size:110,enablePinning:true,
    cell:i=><span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{i.getValue()}</span>,
    enableSorting:true,sortingFn:'alphanumeric'}),
  col.accessor('companyName',{header:'Company',size:200,
    cell:i=><span className="text-sm text-gray-900 dark:text-gray-100 truncate block max-w-[190px]" title={i.getValue()}>{i.getValue()}</span>,
    enableSorting:true,sortingFn:'alphanumeric'}),
  col.accessor('sector',{header:'Sector',size:120,
    cell:i=><span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{i.getValue()}</span>,
    enableSorting:true}),
  col.accessor('marketCapCategory',{header:'Cap',size:85,
    cell:i=><span className={`text-xs font-medium px-1.5 py-0.5 rounded ${CAP_COLORS[i.getValue()]??''}`}>{i.getValue().replace(' Cap','')}</span>}),
  col.accessor('lastPrice',{header:'LTP',size:120,
    cell:i=><PriceCell symbol={i.row.original.symbol} basePrice={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('changePercent',{header:'% Chg',size:100,
    cell:i=><ChangeCell symbol={i.row.original.symbol} baseChange={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('volume',{header:'Volume',size:100,
    cell:i=><VolumeCell value={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('marketCap',{header:'Mkt Cap',size:120,
    cell:i=><MarketCapCell value={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('pe',{header:'P/E',size:80,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatPE(i.getValue())}</span>,
    sortingFn:(a,b)=>(a.original.pe??Infinity)-(b.original.pe??Infinity)}),
  col.accessor('pb',{header:'P/B',size:75,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}</span>,sortingFn:'basic'}),
  col.accessor('dividendYield',{header:'Div%',size:75,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}%</span>,sortingFn:'basic'}),
  col.accessor('roe',{header:'ROE%',size:80,
    cell:i=>{const v=i.getValue();return<span className={`font-mono tabular-nums text-sm ${v>=15?'text-green-600 dark:text-green-400':v<0?'text-red-500':'text-gray-700 dark:text-gray-300'}`}>{formatDecimal(v)}%</span>},sortingFn:'basic'}),
  col.accessor('roce',{header:'ROCE%',size:85,
    cell:i=>{const v=i.getValue();return<span className={`font-mono tabular-nums text-sm ${v>=20?'text-green-600 dark:text-green-400':v<0?'text-red-500':'text-gray-700 dark:text-gray-300'}`}>{formatDecimal(v)}%</span>},sortingFn:'basic'}),
  col.accessor('debtToEquity',{header:'D/E',size:75,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}</span>,sortingFn:'basic'}),
  col.accessor('promoterHolding',{header:'Promoter%',size:100,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}%</span>,sortingFn:'basic'}),
  col.accessor('revenueGrowthYoY',{header:'Rev Gr%',size:85,
    cell:i=>{const v=i.getValue();return<span className={`font-mono tabular-nums text-sm ${v>0?'text-green-600 dark:text-green-400':'text-red-500'}`}>{v>0?'+':''}{formatDecimal(v)}%</span>},sortingFn:'basic'}),
  col.accessor('profitGrowthYoY',{header:'PAT Gr%',size:85,
    cell:i=>{const v=i.getValue();return<span className={`font-mono tabular-nums text-sm ${v>0?'text-green-600 dark:text-green-400':'text-red-500'}`}>{v>0?'+':''}{formatDecimal(v)}%</span>},sortingFn:'basic'}),
  col.accessor('rsi14',{header:'RSI(14)',size:85,
    cell:i=><RSICell value={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('beta',{header:'Beta',size:75,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}</span>,sortingFn:'basic'}),
  col.accessor('macdSignal',{header:'MACD',size:90,
    cell:i=>{const v=i.getValue();return<span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${v==='Bullish'?'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30':v==='Bearish'?'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30':'text-gray-500 bg-gray-100 dark:bg-gray-800'}`}>{v}</span>}}),
  col.accessor('week52High',{header:'52W High',size:100,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">Rs.{i.getValue().toFixed(2)}</span>,sortingFn:'basic'}),
  col.accessor('week52Low',{header:'52W Low',size:100,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">Rs.{i.getValue().toFixed(2)}</span>,sortingFn:'basic'}),
]
'@ | Set-Content -Path "src\components\DataGrid\columns.tsx" -Encoding UTF8
Write-Host "  [OK] columns.tsx fixed" -ForegroundColor Green

Write-Host ""
Write-Host "Done! Refresh browser." -ForegroundColor Cyan
Write-Host "Click any stock row to see the chart on the right." -ForegroundColor Green
