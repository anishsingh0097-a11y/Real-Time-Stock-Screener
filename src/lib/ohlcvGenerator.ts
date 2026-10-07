import type { OHLCV } from '@/types/stock'
function nr():number{return Math.sqrt(-2*Math.log(Math.random()||1e-10))*Math.cos(2*Math.PI*Math.random())}
export function generateOHLCV(startPrice: number, days=365, volatility=0.02, avgVolume=1000000): OHLCV[] {
  const candles: OHLCV[]=[]
  let price=startPrice
  const sd=new Date(); sd.setDate(sd.getDate()-days)
  for(let i=0;i<days;i++){
    const d=new Date(sd); d.setDate(d.getDate()+i)
    if(d.getDay()===0||d.getDay()===6) continue
    const dr=nr()*volatility
    const open=price, i1=open*(1+nr()*volatility*0.5), i2=open*(1+nr()*volatility*0.5)
    const close=open*(1+dr)
    const high=Math.max(open,close,i1,i2)*(1+Math.abs(nr())*0.005)
    const low=Math.min(open,close,i1,i2)*(1-Math.abs(nr())*0.005)
    const vol=Math.round(avgVolume*(1+Math.abs(dr)*10)*(0.5+Math.random()))
    candles.push({time:Math.floor(d.getTime()/1000),open:Math.round(open*100)/100,high:Math.round(high*100)/100,low:Math.round(low*100)/100,close:Math.round(close*100)/100,volume:vol})
    price=close
  }
  return candles
}
// Rescale history so the final close equals the stock's current price (chart matches the grid)
export function alignToPrice(candles: OHLCV[], endPrice: number): OHLCV[] {
  const last=candles[candles.length-1]
  if(!last||last.close<=0||endPrice<=0) return candles
  const k=endPrice/last.close, r=(n:number)=>Math.round(n*k*100)/100
  return candles.map(c=>({...c,open:r(c.open),high:r(c.high),low:r(c.low),close:r(c.close)}))
}
const cache=new Map<string,OHLCV[]>()
export function getOrGenerateOHLCV(symbol: string, startPrice: number): OHLCV[] {
  if(!cache.has(symbol)) cache.set(symbol, alignToPrice(generateOHLCV(startPrice,365), startPrice))
  return cache.get(symbol)!
}
