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
const NAME_FIRST=['Bharat','India','National','Global','United','Premier','Apex','Supreme','Pioneer','Sterling','Zenith','Horizon','Excel','Anand','Shree','Sunrise','Landmark','Heritage','Dynamic','Ashok','Balaji','Coastal','Deccan','Eastern','Ganga','Himalaya','Indus','Jaipur','Kaveri','Lotus','Malabar','Narmada','Orient','Punjab','Rajasthan','Sagar','Tirupati','Uttam','Vijay','Western','Yamuna','Aravali','Konkan','Nilgiri','Sahyadri','Vindhya','Triveni','Surya','Kesari','Maurya']
const NAME_MIDDLE=['Alpha','Prime','Core','Nova','Metro','Royal','Classic','Unity','Vertex','Crest','Summit','Pinnacle','Evergreen','Silverline','Bluechip','Goldstar','Ironbridge','Redwood','Sunstone','Everest','Trident','Anchor','Beacon','Compass','Frontier','Gateway','Harbour','Keystone','Legacy','Momentum']
function genName(sector:Sector,used:Set<string>):string{
  const sfxs=SECTOR_CONFIG[sector].companySuffixes
  for(let n=0;n<40;n++){
    const name=`${pr(NAME_FIRST)} ${pr(NAME_MIDDLE)} ${pr(sfxs)} Ltd`
    if(!used.has(name)){used.add(name);return name}
  }
  for(let k=2;;k++){ // practically unreachable: guarantee uniqueness
    const name=`${pr(NAME_FIRST)} ${pr(NAME_MIDDLE)} ${pr(sfxs)} ${k} Ltd`
    if(!used.has(name)){used.add(name);return name}
  }
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
import nseListedRaw from '@/constants/nseListed.json'
import worldListedRaw from '@/constants/worldListed.json'
const NSE_LISTED=nseListedRaw as {symbol:string;name:string}[]
interface WorldCo{s:string;n:string;m:number;k:string;c:string} // symbol, name, market cap (USD), sector, country
const WORLD_LISTED=worldListedRaw as unknown as WorldCo[] // pre-sorted by market cap (desc) by `npm run sync:companies`
const USD_INR=88 // approximate; used only to express world market caps in Rs Cr like the rest of the grid
const WORLD_SECTOR:Record<string,Sector>={Technology:'IT',Finance:'Banking','Health Care':'Pharma',Energy:'Energy','Basic Materials':'Metal',Telecommunications:'Telecom','Real Estate':'Realty','Consumer Staples':'FMCG',Utilities:'Energy',Industrials:'Infrastructure'}
const worldCap=(usd:number):MarketCapCategory=>usd>=1e10?'Large Cap':usd>=2e9?'Mid Cap':usd>=3e8?'Small Cap':'Micro Cap'
const worldCountry=(c:string)=>c==='United States'?'USA':c||'Other'

export function generateMockStocks(count=5000,force=false):Stock[]{
  if(cache&&!force)return cache
  const stocks:Stock[]=[]
  for(const c of LARGE_CAP_COMPANIES){
    stocks.push({...buildStock(c.symbol,c.name,c.sector,c.cap,genPrice(c.cap),genMC(c.cap)),group:c.group,isReal:true,country:'India'})
  }
  // Every other NSE-listed company (from `npm run sync:companies`): real names, sector/fundamentals unknown -> mock
  const seen=new Set(stocks.map(s=>s.symbol))
  for(const c of NSE_LISTED){ if(seen.has(c.symbol))continue; seen.add(c.symbol)
    stocks.push({...buildStock(c.symbol,c.name,'Others','Small Cap',genPrice('Small Cap'),genMC('Small Cap')),group:'Other listed',isReal:true,country:'India'}) }
  // World companies fill the universe up to `count`, India always first (symbol = TICKER.US)
  const worldSlots=Math.max(0,count-stocks.length)
  const world=WORLD_LISTED.slice(0,worldSlots)
  for(const c of world){ const cap=worldCap(c.m)
    stocks.push({...buildStock(c.s+'.US',c.n,WORLD_SECTOR[c.k]??'Others',cap,genPrice(cap),Math.round(c.m*USD_INR/1e7)),group:'World',isReal:true,country:worldCountry(c.c)}) }
  const usedNames=new Set<string>(LARGE_CAP_COMPANIES.map(c=>c.name))
  // generated placeholders only fill the universe when the real NSE list has not been synced
  const rem=NSE_LISTED.length+WORLD_LISTED.length>0?0:Math.max(0,count-stocks.length)
  const ws=ALL_SECTORS.map(s=>SECTOR_CONFIG[s].targetCount)
  const tot=ws.reduce((a,b)=>a+b,0)
  for(let i=0;i<rem;i++){
    const cat=getCat(LARGE_CAP_COMPANIES.length+i)
    let rand=Math.random()*tot,sector:Sector='Others'
    for(let si=0;si<ALL_SECTORS.length;si++){rand-=ws[si]??0;if(rand<=0){sector=ALL_SECTORS[si] as Sector;break}}
    const sym=genSym(sector,LARGE_CAP_COMPANIES.length+i)
    stocks.push(buildStock(sym,genName(sector,usedNames),sector,cat,genPrice(cat),genMC(cat)))
  }
  cache=stocks;return stocks
}
export function invalidateStockCache():void{cache=null}
