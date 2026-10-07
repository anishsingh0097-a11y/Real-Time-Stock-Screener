import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterConfig, SortConfig, PriceUpdate, Stock } from '@/types/stock'

export interface MarketStatus { open:boolean; asOf:number|null; liveCount:number; realTotal?:number }

interface StockState {
  activeFilters: FilterConfig[]
  addFilter:(f:FilterConfig)=>void
  removeFilter:(id:string)=>void
  updateFilter:(id:string,u:Partial<FilterConfig>)=>void
  clearAllFilters:()=>void
  sortConfig: SortConfig
  setSortConfig:(c:SortConfig)=>void
  selectedSymbol: string|null
  setSelectedSymbol:(s:string|null)=>void
  livePrices: Map<string,PriceUpdate>
  batchUpdatePrices:(u:Map<string,PriceUpdate>)=>void
  marketStatus: MarketStatus|null
  setMarketStatus:(m:MarketStatus)=>void
  watchlist: Set<string>
  toggleWatchlist:(s:string)=>void
  isInWatchlist:(s:string)=>boolean
  // Global stock universe — set once, shared everywhere
  allStocks: Stock[]
  setAllStocks:(stocks:Stock[])=>void
}

export const useStockStore = create<StockState>()(
  persist(
    (set,get) => ({
      activeFilters:[],
      addFilter:(f)=>set(s=>({activeFilters:s.activeFilters.find(x=>x.id===f.id)?s.activeFilters:[...s.activeFilters,f]})),
      removeFilter:(id)=>set(s=>({activeFilters:s.activeFilters.filter(f=>f.id!==id)})),
      updateFilter:(id,u)=>set(s=>({activeFilters:s.activeFilters.map(f=>f.id===id?{...f,...u}:f)})),
      clearAllFilters:()=>set({activeFilters:[]}),
      sortConfig:{column:'marketCap',direction:'desc'},
      setSortConfig:(c)=>set({sortConfig:c}),
      selectedSymbol:null,
      setSelectedSymbol:(s)=>set({selectedSymbol:s}),
      livePrices:new Map(),
      batchUpdatePrices:(u)=>set(s=>{const m=new Map(s.livePrices);u.forEach((v,k)=>m.set(k,v));return{livePrices:m}}),
      marketStatus:null,
      setMarketStatus:(m)=>set({marketStatus:m}),
      watchlist:new Set(),
      toggleWatchlist:(s)=>set(st=>{const w=new Set(st.watchlist);w.has(s)?w.delete(s):w.add(s);return{watchlist:w}}),
      isInWatchlist:(s)=>get().watchlist.has(s),
      allStocks:[],
      setAllStocks:(stocks)=>set({allStocks:stocks}),
    }),
    {
      name:'stock-screener-v1',
      partialize:(s)=>({watchlist:Array.from(s.watchlist),sortConfig:s.sortConfig}),
      merge:(persisted:unknown,current)=>{
        const p=persisted as{watchlist?:string[];sortConfig?:SortConfig}
        return{...current,watchlist:new Set(p?.watchlist??[]),sortConfig:p?.sortConfig??current.sortConfig}
      },
    }
  )
)

export const selectActiveFilters=(s:StockState)=>s.activeFilters
export const selectSortConfig=(s:StockState)=>s.sortConfig
export const selectSelectedSymbol=(s:StockState)=>s.selectedSymbol
export const selectLivePrice=(symbol:string)=>(s:StockState)=>s.livePrices.get(symbol)
