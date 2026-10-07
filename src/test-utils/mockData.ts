import type{Stock}from '@/types/stock'
export function generateMockStock(o:Partial<Stock>={}):Stock{
  return{symbol:'TESTCO',companyName:'Test Company Ltd',sector:'IT',industry:'IT Services',marketCapCategory:'Mid Cap',indexMembership:[],lastPrice:1000,previousClose:990,dayOpen:992,dayHigh:1015,dayLow:985,changePercent:1.01,changeAbsolute:10,volume:500000,avgVolume20D:400000,week52High:1200,week52Low:750,marketCap:5000,pe:22,pb:3.5,dividendYield:1.2,eps:45.5,roe:18,roce:22,debtToEquity:0.3,currentRatio:2.1,promoterHolding:62,revenueGrowthYoY:15,profitGrowthYoY:18,rsi14:55,sma50:950,sma200:880,beta:0.9,atr:25,macdSignal:'Bullish',bollingerPosition:'Within',volumeVsAvg:'Above',lastUpdated:Date.now(),recentlyUpdated:false,...o}
}
export function generateMockStockList(count:number,o:Partial<Stock>={}):Stock[]{
  return Array.from({length:count},(_,i)=>generateMockStock({symbol:`STOCK${String(i).padStart(3,'0')}`,companyName:`Company ${i} Ltd`,marketCap:1000+i*100,lastPrice:100+i,...o}))
}
