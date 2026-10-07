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
    cell:i=><span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">{i.row.original.isLive&&<span title="Real NSE price" className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 align-middle"/>}{i.getValue()}</span>,
    enableSorting:true,sortingFn:'alphanumeric'}),
  col.accessor('companyName',{header:'Company',size:200,
    cell:i=><span className="text-sm text-gray-900 dark:text-gray-100 truncate block max-w-[190px]" title={i.getValue()}>{i.getValue()}</span>,
    enableSorting:true,sortingFn:'alphanumeric'}),
  col.accessor('country',{header:'Country',size:90,cell:i=><span className="text-xs text-gray-600 dark:text-gray-400">{i.getValue()??'—'}</span>,enableSorting:true,sortingFn:'alphanumeric'}),
  col.accessor('group',{header:'Group',size:130,
    cell:i=><span className="text-xs text-gray-600 dark:text-gray-400 truncate block max-w-[120px]" title={i.getValue()??''}>{i.getValue()??'—'}</span>,
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
