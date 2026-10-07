# SAVE THIS AS: setup-day2.ps1
# RUN: .\setup-day2.ps1
# Make sure you are in: D:\Real-Time Stock Screener\stock-screener

Write-Host "Creating Day 2 files..." -ForegroundColor Cyan

# ─── types/stock.ts ───────────────────────────────────────────────────────────
@'
export type Sector = 'IT'|'Banking'|'Pharma'|'Auto'|'FMCG'|'Metal'|'Energy'|'Realty'|'Telecom'|'Infrastructure'|'Media'|'Chemicals'|'Others'
export type MarketCapCategory = 'Large Cap'|'Mid Cap'|'Small Cap'|'Micro Cap'
export type MACDSignal = 'Bullish'|'Bearish'|'Neutral'
export type BollingerPosition = 'Above'|'Within'|'Below'
export type VolumeVsAvg = 'Below'|'Above'|'2x'|'3x'
export type IndexName = 'NIFTY 50'|'NIFTY Next 50'|'NIFTY Midcap 100'|'NIFTY Smallcap 250'|'BSE Sensex'
export interface Stock {
  symbol: string; companyName: string; sector: Sector; industry: string
  marketCapCategory: MarketCapCategory; indexMembership: IndexName[]
  lastPrice: number; previousClose: number; dayOpen: number; dayHigh: number; dayLow: number
  changePercent: number; changeAbsolute: number; volume: number; avgVolume20D: number
  week52High: number; week52Low: number; marketCap: number; pe: number|null; pb: number
  dividendYield: number; eps: number; roe: number; roce: number; debtToEquity: number
  currentRatio: number; promoterHolding: number; revenueGrowthYoY: number; profitGrowthYoY: number
  rsi14: number; sma50: number; sma200: number; beta: number; atr: number
  macdSignal: MACDSignal; bollingerPosition: BollingerPosition; volumeVsAvg: VolumeVsAvg
  lastUpdated: number; recentlyUpdated: boolean
}
export type FilterOperator = 'eq'|'neq'|'gt'|'gte'|'lt'|'lte'|'between'|'in'|'notIn'
export type FilterValue = number|string|boolean|number[]|string[]
export interface FilterConfig { id: string; field: keyof Stock; operator: FilterOperator; value: FilterValue; enabled: boolean; label?: string }
export interface FilterPreset { id: string; name: string; description: string; filters: FilterConfig[] }
export interface SortConfig { column: keyof Stock; direction: 'asc'|'desc' }
export interface PriceUpdate { symbol: string; lastPrice: number; changePercent: number; changeAbsolute: number; volume: number; timestamp: number }
export interface OHLCV { time: number; open: number; high: number; low: number; close: number; volume: number }
export interface ApiResponse<T> { success: boolean; data: T; meta: { total: number; page: number; pageSize: number; timestamp: string; executionTimeMs: number }; error?: { code: string; message: string } }
'@ | Set-Content -Path "src\types\stock.ts" -Encoding UTF8
Write-Host "  [OK] types/stock.ts" -ForegroundColor Green

# ─── utils/formatters.ts ──────────────────────────────────────────────────────
@'
export function formatIndianNumber(value: number): string {
  const a = Math.abs(value), s = value < 0 ? '-' : ''
  if (a >= 1e7) return `${s}${(a/1e7).toFixed(2)}Cr`
  if (a >= 1e5) return `${s}${(a/1e5).toFixed(2)}L`
  if (a >= 1e3) return `${s}${(a/1e3).toFixed(2)}K`
  return `${s}${a.toFixed(2)}`
}
export function formatMarketCap(crore: number): string {
  if (crore >= 1e5) return `${(crore/1e5).toFixed(2)}L Cr`
  if (crore >= 1e3) return `${(crore/1e3).toFixed(2)}K Cr`
  return `${crore.toFixed(0)} Cr`
}
export function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:2,maximumFractionDigits:2}).format(value)
}
export function formatVolume(value: number): string { return formatIndianNumber(value) }
export function formatChangePercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}
export function formatPE(value: number|null): string {
  if (value === null) return 'N/A'
  if (value < 0) return 'Neg'
  return value.toFixed(1)
}
export function formatDecimal(value: number, decimals = 2): string { return value.toFixed(decimals) }
'@ | Set-Content -Path "src\utils\formatters.ts" -Encoding UTF8
Write-Host "  [OK] utils/formatters.ts" -ForegroundColor Green

# ─── constants/SECTORS.ts ─────────────────────────────────────────────────────
@'
import type { Sector } from '@/types/stock'
export interface SectorConfig {
  industries: string[]; avgPE: number; avgBeta: number; avgDividendYield: number
  targetCount: number; debtEquityRange: [number,number]; companySuffixes: string[]
}
export const SECTOR_CONFIG: Record<Sector,SectorConfig> = {
  IT:{industries:['IT Services','Software Products','IT Consulting','BPO','Cloud Services'],avgPE:25,avgBeta:0.85,avgDividendYield:1.5,targetCount:600,debtEquityRange:[0,0.4],companySuffixes:['Tech','Systems','Infotech','Solutions','Digital','Soft']},
  Banking:{industries:['Private Banks','PSU Banks','Small Finance Banks','NBFC','Microfinance'],avgPE:18,avgBeta:1.1,avgDividendYield:1.2,targetCount:750,debtEquityRange:[6,14],companySuffixes:['Bank','Finance','Financial','Capital','Credit']},
  Pharma:{industries:['Pharmaceuticals','Biotechnology','Healthcare Services','Diagnostics','APIs'],avgPE:30,avgBeta:0.7,avgDividendYield:0.8,targetCount:500,debtEquityRange:[0,0.8],companySuffixes:['Pharma','Labs','Biotech','Healthcare','Life Sciences']},
  Auto:{industries:['Passenger Vehicles','Commercial Vehicles','Two Wheelers','Auto Components','EVs'],avgPE:22,avgBeta:1.05,avgDividendYield:1.0,targetCount:350,debtEquityRange:[0.1,1.8],companySuffixes:['Motors','Auto','Automotive','Vehicles','Components']},
  FMCG:{industries:['Personal Care','Food & Beverages','Household Products','Tobacco','Paints'],avgPE:35,avgBeta:0.6,avgDividendYield:1.8,targetCount:400,debtEquityRange:[0,0.4],companySuffixes:['Consumer','Foods','Products','Industries','Brands']},
  Metal:{industries:['Steel','Aluminum','Copper','Zinc','Mining','Pipes & Tubes'],avgPE:12,avgBeta:1.4,avgDividendYield:2.5,targetCount:300,debtEquityRange:[0.5,2.8],companySuffixes:['Steel','Metals','Mining','Industries','Alloys']},
  Energy:{industries:['Oil & Gas','Refineries','Power Generation','Renewable Energy','Gas Distribution'],avgPE:14,avgBeta:0.95,avgDividendYield:3.0,targetCount:300,debtEquityRange:[0.5,2.2],companySuffixes:['Power','Energy','Gas','Petroleum','Oil']},
  Realty:{industries:['Residential','Commercial','REITs','Construction'],avgPE:20,avgBeta:1.3,avgDividendYield:0.5,targetCount:350,debtEquityRange:[0.5,2.8],companySuffixes:['Realty','Properties','Developers','Housing','Estates']},
  Telecom:{industries:['Telecom Services','Telecom Equipment','Tower Infrastructure','Broadband'],avgPE:28,avgBeta:0.9,avgDividendYield:0.3,targetCount:200,debtEquityRange:[1.0,4.5],companySuffixes:['Telecom','Communications','Networks','Connect','Wireless']},
  Infrastructure:{industries:['Construction','Roads & Highways','Railways','Water','Airports'],avgPE:18,avgBeta:1.15,avgDividendYield:1.0,targetCount:400,debtEquityRange:[0.5,1.8],companySuffixes:['Infra','Infrastructure','Construction','Projects','Engineers']},
  Media:{industries:['Broadcasting','Print Media','Digital Media','OTT','Entertainment'],avgPE:28,avgBeta:0.9,avgDividendYield:0.3,targetCount:200,debtEquityRange:[0,0.8],companySuffixes:['Media','Entertainment','Studios','Digital','Network']},
  Chemicals:{industries:['Specialty Chemicals','Agrochemicals','Paints','Adhesives','Dyes'],avgPE:22,avgBeta:0.8,avgDividendYield:1.2,targetCount:350,debtEquityRange:[0,1.2],companySuffixes:['Chemicals','Industries','Organics','Petrochem','Polymers']},
  Others:{industries:['Retail','Aviation','Logistics','Textiles','Sugar','Fertilizers'],avgPE:16,avgBeta:1.0,avgDividendYield:1.5,targetCount:500,debtEquityRange:[0,1.8],companySuffixes:['Industries','Enterprises','Corp','Group','Ventures']},
}
export const ALL_SECTORS = Object.keys(SECTOR_CONFIG) as Sector[]
export const LARGE_CAP_COMPANIES: Array<{symbol:string;name:string;sector:Sector}> = [
  {symbol:'RELIANCE',name:'Reliance Industries',sector:'Energy'},
  {symbol:'TCS',name:'Tata Consultancy Services',sector:'IT'},
  {symbol:'HDFCBANK',name:'HDFC Bank',sector:'Banking'},
  {symbol:'INFY',name:'Infosys',sector:'IT'},
  {symbol:'ICICIBANK',name:'ICICI Bank',sector:'Banking'},
  {symbol:'HINDUNILVR',name:'Hindustan Unilever',sector:'FMCG'},
  {symbol:'ITC',name:'ITC',sector:'FMCG'},
  {symbol:'KOTAKBANK',name:'Kotak Mahindra Bank',sector:'Banking'},
  {symbol:'LT',name:'Larsen & Toubro',sector:'Infrastructure'},
  {symbol:'AXISBANK',name:'Axis Bank',sector:'Banking'},
  {symbol:'SBIN',name:'State Bank of India',sector:'Banking'},
  {symbol:'WIPRO',name:'Wipro',sector:'IT'},
  {symbol:'HCLTECH',name:'HCL Technologies',sector:'IT'},
  {symbol:'MARUTI',name:'Maruti Suzuki India',sector:'Auto'},
  {symbol:'SUNPHARMA',name:'Sun Pharmaceutical',sector:'Pharma'},
  {symbol:'ONGC',name:'Oil & Natural Gas Corp',sector:'Energy'},
  {symbol:'TATAMOTORS',name:'Tata Motors',sector:'Auto'},
  {symbol:'TITAN',name:'Titan Company',sector:'Others'},
  {symbol:'BAJFINANCE',name:'Bajaj Finance',sector:'Banking'},
  {symbol:'ASIANPAINT',name:'Asian Paints',sector:'Chemicals'},
  {symbol:'NTPC',name:'NTPC',sector:'Energy'},
  {symbol:'POWERGRID',name:'Power Grid Corp',sector:'Energy'},
  {symbol:'TATASTEEL',name:'Tata Steel',sector:'Metal'},
  {symbol:'NESTLEIND',name:'Nestle India',sector:'FMCG'},
  {symbol:'DRREDDY',name:'Dr Reddys Laboratories',sector:'Pharma'},
  {symbol:'CIPLA',name:'Cipla',sector:'Pharma'},
  {symbol:'TECHM',name:'Tech Mahindra',sector:'IT'},
  {symbol:'ULTRACEMCO',name:'UltraTech Cement',sector:'Infrastructure'},
  {symbol:'BAJAJFINSV',name:'Bajaj Finserv',sector:'Banking'},
  {symbol:'GRASIM',name:'Grasim Industries',sector:'Chemicals'},
]
export const NIFTY50_SYMBOLS = LARGE_CAP_COMPANIES.map(c => c.symbol)
'@ | Set-Content -Path "src\constants\SECTORS.ts" -Encoding UTF8
Write-Host "  [OK] constants/SECTORS.ts" -ForegroundColor Green

# ─── lib/mockDataGenerator.ts ─────────────────────────────────────────────────
@'
import type { Stock,Sector,MarketCapCategory,MACDSignal,BollingerPosition,VolumeVsAvg,IndexName } from '@/types/stock'
import { ALL_SECTORS,SECTOR_CONFIG,LARGE_CAP_COMPANIES,NIFTY50_SYMBOLS } from '@/constants/SECTORS'
function nr():number{const u=Math.random()||1e-10,v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
function cl(v:number,mn:number,mx:number):number{return Math.max(mn,Math.min(mx,v))}
function rb(mn:number,mx:number):number{return mn+Math.random()*(mx-mn)}
function r2(n:number):number{return Math.round(n*100)/100}
function pr<T>(a:T[]):T{return a[Math.floor(Math.random()*a.length)] as T}
function genMC(cat:MarketCapCategory):number{
  switch(cat){case 'Large Cap':return r2(rb(50000,2000000));case 'Mid Cap':return r2(rb(10000,49999));case 'Small Cap':return r2(rb(1000,9999));case 'Micro Cap':return r2(rb(50,999))}
}
function getCat(i:number):MarketCapCategory{if(i<100)return 'Large Cap';if(i<500)return 'Mid Cap';if(i<2000)return 'Small Cap';return 'Micro Cap'}
function genPrice(cat:MarketCapCategory):number{
  switch(cat){case 'Large Cap':return r2(rb(500,5000));case 'Mid Cap':return r2(rb(100,2000));case 'Small Cap':return r2(rb(20,500));case 'Micro Cap':return r2(rb(5,100))}
}
function genBeta(cat:MarketCapCategory,avg:number):number{
  switch(cat){case 'Large Cap':return r2(cl(avg+nr()*0.15,0.5,1.2));case 'Mid Cap':return r2(cl(avg+nr()*0.25,0.6,1.8));case 'Small Cap':return r2(cl(avg+nr()*0.4,0.4,2.2));case 'Micro Cap':return r2(cl(avg+nr()*0.6,0.3,2.5))}
}
function genPromoter(cat:MarketCapCategory):number{
  switch(cat){case 'Large Cap':return r2(cl(nr()*12+55,40,75));case 'Mid Cap':return r2(cl(nr()*15+52,35,80));case 'Small Cap':return r2(cl(nr()*20+50,25,85));case 'Micro Cap':return r2(cl(nr()*25+50,20,90))}
}
function genPE(rg:number,pg:number,avg:number):number|null{
  if(pg<-30&&Math.random()<0.3)return null
  const g=(rg+pg)/2;let pe=avg
  if(g>25)pe=cl(avg*rb(1.2,2.5),20,80);else if(g>10)pe=cl(avg*rb(0.9,1.4),12,45);else pe=cl(avg*rb(0.5,1.0),5,25)
  return r2(pe+nr()*3)
}
function genRSI(cp:number):number{return r2(cl(50+cp*3+nr()*12,10,90))}
function getVVA(v:number,avg:number):VolumeVsAvg{const r=v/avg;if(r>=3)return '3x';if(r>=2)return '2x';if(r>=1)return 'Above';return 'Below'}
function getMACDSig(rsi:number,cp:number):MACDSignal{if(cp>1.5&&rsi>55)return 'Bullish';if(cp<-1.5&&rsi<45)return 'Bearish';return 'Neutral'}
function getBP(rsi:number):BollingerPosition{if(rsi>70)return 'Above';if(rsi<30)return 'Below';return 'Within'}
function genSym(sector:Sector,i:number):string{
  const p:Record<Sector,string[]>={IT:['TECH','INFO','SOFT','DATA','NET'],Banking:['FIN','BANK','CAP','CRED','MONY'],Pharma:['PHARM','BIO','MED','LIFE','CURE'],Auto:['AUTO','MOTOR','GEAR','DRIV','ENG'],FMCG:['CONS','FOOD','CARE','PURE','BRND'],Metal:['STEEL','METL','ALLOY','ZINC','ALUM'],Energy:['ENRG','PWR','GAS','OIL','SOLR'],Realty:['REAL','PROP','BILD','HOUS','LAND'],Telecom:['TEL','COMM','WIRE','LINK','CONN'],Infrastructure:['INFRA','CNST','ROAD','RAIL','BRID'],Media:['MEDIA','ENT','FILM','NEWS','BROD'],Chemicals:['CHEM','SPEC','POLY','ORG','DYE'],Others:['CORP','IND','GRP','VENT','GLOB']}
  return `${pr(p[sector]??['CORP'])}${String(i).padStart(3,'0')}`
}
function genName(sector:Sector):string{
  const cfg=SECTOR_CONFIG[sector],sfx=pr(cfg.companySuffixes)
  const fw=['Bharat','India','National','Global','United','Premier','Apex','Supreme','Pioneer','Sterling','Zenith','Horizon','Excel','Anand','Shree','Sunrise','Landmark','Heritage','Dynamic']
  return `${pr(fw)} ${sfx} Ltd`
}
function genIdx(sym:string,cat:MarketCapCategory):IndexName[]{
  const m:IndexName[]=[]
  if(NIFTY50_SYMBOLS.includes(sym)){m.push('NIFTY 50');m.push('BSE Sensex')}
  else if(cat==='Large Cap'&&Math.random()<0.5)m.push('NIFTY Next 50')
  else if(cat==='Mid Cap'&&Math.random()<0.6)m.push('NIFTY Midcap 100')
  else if(cat==='Small Cap'&&Math.random()<0.4)m.push('NIFTY Smallcap 250')
  return m
}
function buildStock(sym:string,name:string,sector:Sector,cat:MarketCapCategory,price:number,mc:number):Stock{
  const cfg=SECTOR_CONFIG[sector],[dmn,dmx]=cfg.debtEquityRange
  const cp=r2(nr()*2.8),ca=r2(price*cp/100)
  const av=Math.round(cat==='Large Cap'?rb(500000,10000000):cat==='Mid Cap'?rb(100000,2000000):cat==='Small Cap'?rb(10000,500000):rb(1000,100000))
  const v=Math.round(av*cl(0.5+Math.random()*2,0.1,5))
  const rg=r2(nr()*20+10),pg=r2(nr()*25+8),rsi=genRSI(cp)
  return{symbol:sym,companyName:name,sector,industry:pr(cfg.industries),marketCapCategory:cat,indexMembership:genIdx(sym,cat),
    lastPrice:price,previousClose:r2(price-ca),dayOpen:r2(price+nr()*price*0.008),
    dayHigh:r2(price*(1+Math.abs(nr())*0.025)),dayLow:r2(price*(1-Math.abs(nr())*0.025)),
    changePercent:cp,changeAbsolute:ca,volume:v,avgVolume20D:av,
    week52High:r2(price*rb(1.05,1.8)),week52Low:r2(price*rb(0.4,0.95)),
    marketCap:mc,pe:genPE(rg,pg,cfg.avgPE),pb:r2(cl(nr()*1.5+2,0.3,15)),
    dividendYield:r2(cl(nr()*1.2+cfg.avgDividendYield,0,12)),eps:r2(rb(1,price/10)),
    roe:r2(cl(nr()*10+14,-20,50)),roce:r2(cl(nr()*12+16,-10,55)),
    debtToEquity:r2(cl(rb(dmn,dmx),dmn,dmx)),currentRatio:r2(cl(nr()*0.8+1.5,0.3,8)),
    promoterHolding:genPromoter(cat),revenueGrowthYoY:rg,profitGrowthYoY:pg,
    rsi14:rsi,sma50:r2(price*rb(0.88,1.12)),sma200:r2(price*rb(0.70,1.30)),
    beta:genBeta(cat,cfg.avgBeta),atr:r2(price*rb(0.01,0.06)),
    macdSignal:getMACDSig(rsi,cp),bollingerPosition:getBP(rsi),volumeVsAvg:getVVA(v,av),
    lastUpdated:Date.now(),recentlyUpdated:false}
}
let cache:Stock[]|null=null
export function generateMockStocks(count=5000,force=false):Stock[]{
  if(cache&&!force)return cache
  const stocks:Stock[]=[]
  for(const c of LARGE_CAP_COMPANIES){
    stocks.push(buildStock(c.symbol,c.name,c.sector,'Large Cap',r2(rb(500,5000)),r2(rb(50000,2000000))))
  }
  const rem=Math.max(0,count-stocks.length)
  const ws=ALL_SECTORS.map(s=>SECTOR_CONFIG[s].targetCount)
  const tot=ws.reduce((a,b)=>a+b,0)
  for(let i=0;i<rem;i++){
    const cat=getCat(LARGE_CAP_COMPANIES.length+i)
    let rand=Math.random()*tot,sector:Sector='Others'
    for(let si=0;si<ALL_SECTORS.length;si++){rand-=ws[si]??0;if(rand<=0){sector=ALL_SECTORS[si] as Sector;break}}
    const sym=genSym(sector,LARGE_CAP_COMPANIES.length+i)
    stocks.push(buildStock(sym,genName(sector),sector,cat,genPrice(cat),genMC(cat)))
  }
  cache=stocks;return stocks
}
export function invalidateStockCache():void{cache=null}
'@ | Set-Content -Path "src\lib\mockDataGenerator.ts" -Encoding UTF8
Write-Host "  [OK] lib/mockDataGenerator.ts" -ForegroundColor Green

# ─── stores/stockStore.ts (Zustand v5) ────────────────────────────────────────
@'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FilterConfig,SortConfig,PriceUpdate } from '@/types/stock'
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
  watchlist: Set<string>
  toggleWatchlist:(s:string)=>void
  isInWatchlist:(s:string)=>boolean
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
      watchlist:new Set(),
      toggleWatchlist:(s)=>set(st=>{const w=new Set(st.watchlist);w.has(s)?w.delete(s):w.add(s);return{watchlist:w}}),
      isInWatchlist:(s)=>get().watchlist.has(s),
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
'@ | Set-Content -Path "src\stores\stockStore.ts" -Encoding UTF8
Write-Host "  [OK] stores/stockStore.ts" -ForegroundColor Green

# ─── app/api/stocks/route.ts ──────────────────────────────────────────────────
@'
import { NextResponse } from 'next/server'
import { generateMockStocks } from '@/lib/mockDataGenerator'
import type { ApiResponse,Stock } from '@/types/stock'
let cacheTs=0
export async function GET(request:Request):Promise<NextResponse<ApiResponse<Stock[]>>>{
  const start=performance.now()
  const{searchParams}=new URL(request.url)
  const page=parseInt(searchParams.get('page')?? '1',10)
  const pageSize=parseInt(searchParams.get('pageSize')?? '5000',10)
  const force=Date.now()-cacheTs>300000
  if(force)cacheTs=Date.now()
  const all=generateMockStocks(5000,force)
  const si=(page-1)*pageSize
  return NextResponse.json({success:true,data:all.slice(si,si+pageSize),meta:{total:all.length,page,pageSize,timestamp:new Date().toISOString(),executionTimeMs:Math.round(performance.now()-start)}})
}
'@ | Set-Content -Path "src\app\api\stocks\route.ts" -Encoding UTF8
Write-Host "  [OK] app/api/stocks/route.ts" -ForegroundColor Green

# ─── app/providers.tsx ────────────────────────────────────────────────────────
@'
'use client'
import React,{useState} from 'react'
import{QueryClient,QueryClientProvider}from '@tanstack/react-query'
export function Providers({children}:{children:React.ReactNode}){
  const[qc]=useState(()=>new QueryClient({defaultOptions:{queries:{staleTime:300000,retry:2}}}))
  return<QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
'@ | Set-Content -Path "src\app\providers.tsx" -Encoding UTF8
Write-Host "  [OK] app/providers.tsx" -ForegroundColor Green

# ─── app/layout.tsx ───────────────────────────────────────────────────────────
@'
import type{Metadata}from 'next'
import{Inter}from 'next/font/google'
import './globals.css'
import{Providers}from './providers'
const inter=Inter({subsets:['latin'],display:'swap'})
export const metadata:Metadata={title:'Stock Screener Pro',description:'Real-time Indian equity screener'}
export default function RootLayout({children}:{children:React.ReactNode}){
  return<html lang="en" suppressHydrationWarning><body className={inter.className}><Providers>{children}</Providers></body></html>
}
'@ | Set-Content -Path "src\app\layout.tsx" -Encoding UTF8
Write-Host "  [OK] app/layout.tsx" -ForegroundColor Green

# ─── app/page.tsx ─────────────────────────────────────────────────────────────
@'
import{redirect}from 'next/navigation'
export default function HomePage(){redirect('/screener')}
'@ | Set-Content -Path "src\app\page.tsx" -Encoding UTF8
Write-Host "  [OK] app/page.tsx" -ForegroundColor Green

# ─── app/globals.css ──────────────────────────────────────────────────────────
@'
@tailwind base;
@tailwind components;
@tailwind utilities;
@layer base{*{box-sizing:border-box}html,body{height:100%;margin:0;padding:0}}
'@ | Set-Content -Path "src\app\globals.css" -Encoding UTF8
Write-Host "  [OK] app/globals.css" -ForegroundColor Green

# ─── app/screener/page.tsx ────────────────────────────────────────────────────
@'
'use client'
import React from 'react'
import{useQuery}from '@tanstack/react-query'
import{DataGrid}from '@/components/DataGrid/DataGrid'
import type{ApiResponse,Stock}from '@/types/stock'
async function fetchStocks():Promise<Stock[]>{
  const r=await fetch('/api/stocks?pageSize=5000')
  if(!r.ok)throw new Error('Failed to fetch')
  const j:ApiResponse<Stock[]>=await r.json()
  return j.data
}
export default function ScreenerPage(){
  const{data:stocks,isLoading,error}=useQuery({queryKey:['stocks','universe'],queryFn:fetchStocks,staleTime:300000})
  if(error)return<div className="flex items-center justify-center h-screen text-red-500">Error: {(error as Error).message}</div>
  return(
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-950">
      <aside className="w-80 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 overflow-y-auto">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Filters</h2>
          <p className="text-xs text-gray-400 mt-1">30+ filters — Day 3</p>
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden p-3 gap-3">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-gray-900 dark:text-white">Stock Screener</h1><p className="text-xs text-gray-500">NSE / BSE • Real-time prices</p></div>
          <span className="flex items-center gap-1.5 text-xs text-green-500 font-medium"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"/>Live</span>
        </div>
        <div className="flex-1 overflow-hidden"><DataGrid data={stocks??[]} isLoading={isLoading}/></div>
      </main>
      <aside className="w-96 border-l border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-shrink-0 flex items-center justify-center">
        <p className="text-xs text-gray-400">Chart panel — Day 4</p>
      </aside>
    </div>
  )
}
'@ | Set-Content -Path "src\app\screener\page.tsx" -Encoding UTF8
Write-Host "  [OK] app/screener/page.tsx" -ForegroundColor Green

# ─── components/DataGrid/cells ────────────────────────────────────────────────
@'
'use client'
import React,{memo,useEffect,useRef,useState}from 'react'
import{formatPrice}from '@/utils/formatters'
import{useStockStore}from '@/stores/stockStore'
interface Props{symbol:string;basePrice:number}
export const PriceCell=memo(function PriceCell({symbol,basePrice}:Props){
  const lp=useStockStore(s=>s.livePrices.get(symbol))
  const price=lp?.lastPrice??basePrice
  const prev=useRef(price)
  const[flash,setFlash]=useState('')
  useEffect(()=>{
    if(price===prev.current)return
    setFlash(price>prev.current?'animate-flash-green':'animate-flash-red')
    prev.current=price
    const t=setTimeout(()=>setFlash(''),300)
    return()=>clearTimeout(t)
  },[price])
  return<span className={`font-mono tabular-nums text-sm ${flash}`}>{formatPrice(price)}</span>
},(p,n)=>p.symbol===n.symbol&&p.basePrice===n.basePrice)
'@ | Set-Content -Path "src\components\DataGrid\cells\PriceCell.tsx" -Encoding UTF8

@'
'use client'
import React,{memo}from 'react'
import{useStockStore}from '@/stores/stockStore'
import{formatChangePercent}from '@/utils/formatters'
interface Props{symbol:string;baseChange:number}
export const ChangeCell=memo(function ChangeCell({symbol,baseChange}:Props){
  const lp=useStockStore(s=>s.livePrices.get(symbol))
  const change=lp?.changePercent??baseChange
  return<span className={`font-mono tabular-nums text-sm font-medium ${change>=0?'text-green-600 dark:text-green-400':'text-red-500 dark:text-red-400'}`}>{change>=0?'▲':'▼'} {formatChangePercent(change)}</span>
},(p,n)=>p.symbol===n.symbol&&p.baseChange===n.baseChange)
'@ | Set-Content -Path "src\components\DataGrid\cells\ChangeCell.tsx" -Encoding UTF8

@'
'use client'
import React,{memo}from 'react'
import{formatVolume}from '@/utils/formatters'
export const VolumeCell=memo(function VolumeCell({value}:{value:number}){
  return<span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatVolume(value)}</span>
})
'@ | Set-Content -Path "src\components\DataGrid\cells\VolumeCell.tsx" -Encoding UTF8

@'
'use client'
import React,{memo}from 'react'
import{formatMarketCap}from '@/utils/formatters'
export const MarketCapCell=memo(function MarketCapCell({value}:{value:number}){
  return<span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">₹{formatMarketCap(value)}</span>
})
'@ | Set-Content -Path "src\components\DataGrid\cells\MarketCapCell.tsx" -Encoding UTF8

@'
'use client'
import React,{memo}from 'react'
export const RSICell=memo(function RSICell({value}:{value:number}){
  const cls=value<30?'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400':value>70?'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400':'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
  return<span className={`font-mono tabular-nums text-xs font-semibold px-1.5 py-0.5 rounded ${cls}`}>{value.toFixed(1)}</span>
})
'@ | Set-Content -Path "src\components\DataGrid\cells\RSICell.tsx" -Encoding UTF8
Write-Host "  [OK] All cell components" -ForegroundColor Green

# ─── components/DataGrid/columns.tsx ─────────────────────────────────────────
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
const CAP_COLORS:Record<string,string>={'Large Cap':'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-900/30','Mid Cap':'text-purple-700 bg-purple-50 dark:text-purple-300 dark:bg-purple-900/30','Small Cap':'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30','Micro Cap':'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-800'}
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
  col.accessor('marketCapCategory',{header:'Cap',size:90,
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
  col.accessor('profitGrowthYoY',{header:'Pat Gr%',size:85,
    cell:i=>{const v=i.getValue();return<span className={`font-mono tabular-nums text-sm ${v>0?'text-green-600 dark:text-green-400':'text-red-500'}`}>{v>0?'+':''}{formatDecimal(v)}%</span>},sortingFn:'basic'}),
  col.accessor('rsi14',{header:'RSI(14)',size:85,
    cell:i=><RSICell value={i.getValue()}/>,sortingFn:'basic'}),
  col.accessor('beta',{header:'Beta',size:75,
    cell:i=><span className="font-mono tabular-nums text-sm text-gray-700 dark:text-gray-300">{formatDecimal(i.getValue())}</span>,sortingFn:'basic'}),
  col.accessor('macdSignal',{header:'MACD',size:90,
    cell:i=>{const v=i.getValue();return<span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${v==='Bullish'?'text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30':v==='Bearish'?'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30':'text-gray-500 bg-gray-100 dark:bg-gray-800'}`}>{v}</span>}}),
]
'@ | Set-Content -Path "src\components\DataGrid\columns.tsx" -Encoding UTF8
Write-Host "  [OK] components/DataGrid/columns.tsx" -ForegroundColor Green

# ─── components/DataGrid/DataGrid.tsx ────────────────────────────────────────
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
  if(isLoading)return<div className="flex items-center justify-center h-full text-gray-400"><div className="flex flex-col items-center gap-3"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/><span className="text-sm">Loading 5,000 stocks…</span></div></div>
  return(
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
        <span className="text-xs text-gray-500 dark:text-gray-400">Showing <span className="font-semibold text-gray-900 dark:text-white">{rows.length.toLocaleString('en-IN')}</span> stocks</span>
        <span className="text-xs text-gray-400">Sorted by <span className="font-medium">{sortConfig.column}</span> {sortConfig.direction==='desc'?'↓':'↑'}</span>
      </div>
      <div ref={ref} className="flex-1 overflow-auto" role="grid" aria-label="Stock Screener Results" aria-rowcount={rows.length}>
        <div style={{minWidth:table.getTotalSize()}}>
          <div className="sticky top-0 z-20 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
            {table.getHeaderGroups().map(hg=>(
              <div key={hg.id} className="flex" role="row">
                {hg.headers.map((h,hi)=>{
                  const pinned=h.column.getIsPinned(),sorted=h.column.getIsSorted()
                  return(
                    <div key={h.id} role="columnheader" aria-colindex={hi+1} aria-sort={sorted==='asc'?'ascending':sorted==='desc'?'descending':'none'}
                      style={{width:h.getSize()}}
                      className={`flex items-center px-3 h-9 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 select-none shrink-0${h.column.getCanSort()?' cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors':''}${pinned==='left'?' sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-[2px_0_4px_rgba(0,0,0,0.08)]':''}`}
                      onClick={h.column.getToggleSortingHandler()} tabIndex={h.column.getCanSort()?0:-1}
                      onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();h.column.getToggleSortingHandler()?.(e)}}}>
                      {flexRender(h.column.columnDef.header,h.getContext())}
                      {sorted==='asc'&&<span className="ml-1">↑</span>}{sorted==='desc'&&<span className="ml-1">↓</span>}
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
                  className={`flex items-center border-b border-gray-100 dark:border-gray-800/60 cursor-pointer transition-colors duration-150${sel?' bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-500':even?' bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/50':' bg-gray-50/50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}
                  onClick={()=>onRow(row.original.symbol)}>
                  {row.getVisibleCells().map((cell,ci)=>{
                    const pinned=cell.column.getIsPinned()
                    return(
                      <div key={cell.id} role="gridcell" aria-colindex={ci+1} tabIndex={-1}
                        style={{width:cell.column.getSize()}}
                        className={`flex items-center px-3 shrink-0 overflow-hidden${pinned==='left'?` sticky left-0 z-10 shadow-[2px_0_4px_rgba(0,0,0,0.06)]${sel?' bg-blue-50 dark:bg-blue-900/20':even?' bg-white dark:bg-gray-900':' bg-gray-50/50 dark:bg-gray-800/20'}`:'`'}`}>
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
Write-Host "  [OK] components/DataGrid/DataGrid.tsx" -ForegroundColor Green

# ─── test-utils ───────────────────────────────────────────────────────────────
@'
import '@testing-library/jest-dom'
'@ | Set-Content -Path "src\test-utils\setup.ts" -Encoding UTF8

@'
import type{Stock}from '@/types/stock'
export function generateMockStock(o:Partial<Stock>={}):Stock{
  return{symbol:'TESTCO',companyName:'Test Company Ltd',sector:'IT',industry:'IT Services',marketCapCategory:'Mid Cap',indexMembership:[],lastPrice:1000,previousClose:990,dayOpen:992,dayHigh:1015,dayLow:985,changePercent:1.01,changeAbsolute:10,volume:500000,avgVolume20D:400000,week52High:1200,week52Low:750,marketCap:5000,pe:22,pb:3.5,dividendYield:1.2,eps:45.5,roe:18,roce:22,debtToEquity:0.3,currentRatio:2.1,promoterHolding:62,revenueGrowthYoY:15,profitGrowthYoY:18,rsi14:55,sma50:950,sma200:880,beta:0.9,atr:25,macdSignal:'Bullish',bollingerPosition:'Within',volumeVsAvg:'Above',lastUpdated:Date.now(),recentlyUpdated:false,...o}
}
export function generateMockStockList(count:number,o:Partial<Stock>={}):Stock[]{
  return Array.from({length:count},(_,i)=>generateMockStock({symbol:`STOCK${String(i).padStart(3,'0')}`,companyName:`Company ${i} Ltd`,marketCap:1000+i*100,lastPrice:100+i,...o}))
}
'@ | Set-Content -Path "src\test-utils\mockData.ts" -Encoding UTF8
Write-Host "  [OK] test-utils" -ForegroundColor Green

Write-Host ""
Write-Host "All files created! Now run: npm run dev" -ForegroundColor Cyan
