// src/lib/indicators.ts
export interface IndicatorPoint { time: number; value: number }
export interface BollingerPoint { time: number; upper: number; middle: number; lower: number }
export interface MACDPoint { time: number; macd: number; signal: number; histogram: number }
export interface VolumeProfileBar { priceFrom: number; priceTo: number; volume: number; isPointOfControl: boolean }

export function calculateSMA(closes: number[], period: number): (number|undefined)[] {
  const r: (number|undefined)[] = new Array(closes.length).fill(undefined)
  if (period<=0||period>closes.length) return r
  for (let i=period-1;i<closes.length;i++) {
    let s=0; for(let j=0;j<period;j++) s+=closes[i-j]!; r[i]=s/period
  }
  return r
}

export function calculateEMA(closes: number[], period: number): (number|undefined)[] {
  const r: (number|undefined)[] = new Array(closes.length).fill(undefined)
  if (period<=0||period>closes.length) return r
  const k=2/(period+1)
  let s=0; for(let i=0;i<period;i++) s+=closes[i]!
  let ema=s/period; r[period-1]=ema
  for (let i=period;i<closes.length;i++) { ema=closes[i]!*k+ema*(1-k); r[i]=ema }
  return r
}

export function calculateBollinger(closes: number[], period=20, mult=2): (BollingerPoint|undefined)[] {
  const r: (BollingerPoint|undefined)[] = new Array(closes.length).fill(undefined)
  if (period<=0||period>closes.length) return r
  for (let i=period-1;i<closes.length;i++) {
    let sum=0; for(let j=0;j<period;j++) sum+=closes[i-j]!
    const mid=sum/period
    let variance=0; for(let j=0;j<period;j++) variance+=Math.pow(closes[i-j]!-mid,2)
    const sd=Math.sqrt(variance/period)
    r[i]={time:0,upper:mid+mult*sd,middle:mid,lower:mid-mult*sd}
  }
  return r
}

export function calculateRSI(closes: number[], period=14): (number|undefined)[] {
  const r: (number|undefined)[] = new Array(closes.length).fill(undefined)
  if (closes.length<period+1) return r
  const gains: number[]=[], losses: number[]=[]
  for (let i=1;i<closes.length;i++) {
    const d=closes[i]!-closes[i-1]!
    gains.push(Math.max(d,0)); losses.push(Math.abs(Math.min(d,0)))
  }
  let ag=gains.slice(0,period).reduce((a,b)=>a+b,0)/period
  let al=losses.slice(0,period).reduce((a,b)=>a+b,0)/period
  r[period]=al===0?100:ag===0?0:100-100/(1+ag/al)
  for (let i=period;i<gains.length;i++) {
    ag=(ag*(period-1)+gains[i]!)/period; al=(al*(period-1)+losses[i]!)/period
    r[i+1]=al===0?100:ag===0?0:100-100/(1+ag/al)
  }
  return r
}

export function calculateMACD(closes: number[], fast=12, slow=26, signal=9): (MACDPoint|undefined)[] {
  const r: (MACDPoint|undefined)[] = new Array(closes.length).fill(undefined)
  const e12=calculateEMA(closes,fast), e26=calculateEMA(closes,slow)
  const macdLine: number[]=[], macdIdx: number[]=[]
  for (let i=0;i<closes.length;i++) {
    if(e12[i]!==undefined&&e26[i]!==undefined) { macdLine.push(e12[i]!-e26[i]!); macdIdx.push(i) }
  }
  const sigVals=calculateEMA(macdLine,signal)
  for (let j=0;j<sigVals.length;j++) {
    if(sigVals[j]!==undefined) {
      const idx=macdIdx[j]!, macd=macdLine[j]!, sig=sigVals[j]!
      r[idx]={time:0,macd,signal:sig,histogram:macd-sig}
    }
  }
  return r
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period=14): (number|undefined)[] {
  const r: (number|undefined)[] = new Array(closes.length).fill(undefined)
  if (closes.length<period+1) return r
  const tr: number[]=[]
  for (let i=1;i<closes.length;i++) {
    const h=highs[i]!,l=lows[i]!,pc=closes[i-1]!
    tr.push(Math.max(h-l,Math.abs(h-pc),Math.abs(l-pc)))
  }
  let atr=tr.slice(0,period).reduce((a,b)=>a+b,0)/period; r[period]=atr
  for (let i=period;i<tr.length;i++) { atr=(atr*(period-1)+tr[i]!)/period; r[i+1]=atr }
  return r
}

export function calculateVolumeProfile(highs: number[], lows: number[], volumes: number[], buckets=30): VolumeProfileBar[] {
  if (!highs.length) return []
  const pMin=Math.min(...lows), pMax=Math.max(...highs), range=pMax-pMin
  if (range===0) return []
  const bs=range/buckets, bv=new Array<number>(buckets).fill(0)
  for (let i=0;i<highs.length;i++) {
    const h=highs[i]!,l=lows[i]!,v=volumes[i]!,cr=h-l
    if(cr===0){const b=Math.min(Math.floor((h-pMin)/bs),buckets-1);bv[b]!+=v;continue}
    const bFrom=Math.floor((l-pMin)/bs), bTo=Math.min(Math.floor((h-pMin)/bs),buckets-1)
    for (let b=bFrom;b<=bTo;b++) {
      const ol=Math.min(h,pMin+(b+1)*bs)-Math.max(l,pMin+b*bs)
      if(ol>0) bv[b]!+=v*(ol/cr)
    }
  }
  const mx=Math.max(...bv)
  return bv.map((vol,i)=>({priceFrom:pMin+i*bs,priceTo:pMin+(i+1)*bs,volume:vol,isPointOfControl:vol===mx}))
}

export function toIndicatorPoints(values: (number|undefined)[], times: number[]): IndicatorPoint[] {
  const r: IndicatorPoint[]=[]
  for (let i=0;i<values.length;i++) if(values[i]!==undefined&&times[i]!==undefined) r.push({time:times[i]!,value:values[i]!})
  return r
}
