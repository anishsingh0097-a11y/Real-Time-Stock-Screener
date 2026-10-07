import type { PriceUpdate } from '@/types/stock'
function gr():number{return Math.sqrt(-2*Math.log(Math.random()||1e-10))*Math.cos(2*Math.PI*Math.random())}
export function simulateNextPrice(p: number, vol=0.02, drift=0.0001, dt=1/252): number {
  return p*(1+drift*dt+vol*Math.sqrt(dt)*gr())
}
export function simulateSectorMovement(
  stocks: Array<{symbol:string;lastPrice:number;changePercent:number;volatility:number}>,
  corr=0.6
): Map<string,PriceUpdate> {
  const shock=gr(), updates=new Map<string,PriceUpdate>()
  for(const s of stocks){
    const combined=corr*shock+Math.sqrt(1-corr**2)*gr()
    const change=0.0001+s.volatility*combined*Math.sqrt(1/252)
    const np=Math.max(0.01,s.lastPrice*(1+change))
    const ca=np-s.lastPrice, cp=(ca/s.lastPrice)*100
    updates.set(s.symbol,{symbol:s.symbol,lastPrice:Math.round(np*100)/100,changePercent:Math.round(cp*100)/100,changeAbsolute:Math.round(ca*100)/100,volume:Math.round(Math.abs(gr())*1e6+1e5),timestamp:Date.now()})
  }
  return updates
}
