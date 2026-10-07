import{describe,it,expect}from 'vitest'
import{calculateSMA,calculateEMA,calculateBollinger,calculateRSI,calculateMACD,calculateATR,calculateVolumeProfile}from '@/lib/indicators'
const P=[100,102,104,103,105,107,106,108,110,109,111,113,112,114,116]
describe('SMA',()=>{
  it('calculates period 5 correctly',()=>{const r=calculateSMA(P,5);expect(r[4]).toBeCloseTo(102.8,2);expect(r[0]).toBeUndefined()})
  it('returns undefined for insufficient data',()=>{expect(calculateSMA([1,2,3],5).every(v=>v===undefined)).toBe(true)})
  it('period=1 returns input',()=>{const r=calculateSMA([42,43,44],1);expect(r[0]).toBe(42);expect(r[2]).toBe(44)})
  it('length matches input',()=>{expect(calculateSMA(P,5)).toHaveLength(P.length)})
  it('index 9 is correct',()=>{const r=calculateSMA(P,5);expect(r[9]).toBeCloseTo((107+106+108+110+109)/5,2)})
})
describe('EMA',()=>{
  it('seeds with SMA',()=>{const r=calculateEMA(P,5);const s=calculateSMA(P,5);expect(r[4]).toBeCloseTo(s[4]!,4)})
  it('applies multiplier k=0.5 for period 3',()=>{const r=calculateEMA([10,11,12,13,14,15],3);expect(r[2]).toBeCloseTo(11,4);expect(r[3]).toBeCloseTo(12,4)})
  it('undefined before period-1',()=>{expect(calculateEMA(P,5)[0]).toBeUndefined()})
  it('length matches input',()=>{expect(calculateEMA(P,5)).toHaveLength(P.length)})
  it('EMA defined for all valid indices',()=>{const p=[10,20,15,25,18,30,22,35,28,40,33,45,38,50,42];const e=calculateEMA(p,5);expect(e[4]).toBeDefined();expect(e[14]).toBeDefined();expect(typeof e[14]).toBe('number')})
})
describe('Bollinger Bands',()=>{
  it('middle equals SMA(20)',()=>{const p=Array.from({length:30},(_,i)=>100+i);const bb=calculateBollinger(p,20);expect(bb[19]?.middle).toBeCloseTo(calculateSMA(p,20)[19]!,4)})
  it('upper > middle > lower',()=>{const p=Array.from({length:30},(_,i)=>100+Math.sin(i)*5);const v=calculateBollinger(p,20)[25];if(v){expect(v.upper).toBeGreaterThan(v.middle);expect(v.middle).toBeGreaterThan(v.lower)}})
  it('flat prices collapse bands to SMA',()=>{const v=calculateBollinger(new Array(25).fill(100),20)[20];if(v){expect(v.upper).toBeCloseTo(100,4);expect(v.lower).toBeCloseTo(100,4)}})
  it('returns undefined for insufficient data',()=>{expect(calculateBollinger([1,2,3],20).every(v=>v===undefined)).toBe(true)})
})
describe('RSI',()=>{
  it('RSI=100 for all gains',()=>{const r=calculateRSI(Array.from({length:20},(_,i)=>100+i),14).filter(v=>v!==undefined);expect(r[0]).toBe(100)})
  it('RSI=0 for all losses',()=>{const r=calculateRSI(Array.from({length:20},(_,i)=>200-i),14).filter(v=>v!==undefined);expect(r[0]).toBe(0)})
  it('values in 0-100',()=>{calculateRSI(P,5).forEach(v=>{if(v!==undefined){expect(v).toBeGreaterThanOrEqual(0);expect(v).toBeLessThanOrEqual(100)}})})
  it('returns undefined for insufficient data',()=>{expect(calculateRSI([1,2,3],14).every(v=>v===undefined)).toBe(true)})
  it('length matches input',()=>{expect(calculateRSI(P,5)).toHaveLength(P.length)})
})
describe('MACD',()=>{
  it('histogram = macd - signal',()=>{const p=Array.from({length:50},(_,i)=>100+Math.sin(i)*10);calculateMACD(p).filter(v=>v!==undefined).forEach(v=>{expect(v!.histogram).toBeCloseTo(v!.macd-v!.signal,8)})})
  it('undefined if data insufficient',()=>{expect(calculateMACD(P).every(v=>v===undefined)).toBe(true)})
  it('length matches input',()=>{expect(calculateMACD(Array.from({length:60},(_,i)=>100+i))).toHaveLength(60)})
})
describe('ATR',()=>{
  it('always positive',()=>{const h=P.map(p=>p+2),l=P.map(p=>p-2);calculateATR(h,l,P,5).forEach(v=>{if(v!==undefined)expect(v).toBeGreaterThan(0)})})
  it('insufficient data returns undefined',()=>{expect(calculateATR([1,2],[1,2],[1,2],14).every(v=>v===undefined)).toBe(true)})
  it('constant OHLC ATR=H-L',()=>{const h=new Array(20).fill(105),l=new Array(20).fill(95),c=new Array(20).fill(100);calculateATR(h,l,c,5).filter(v=>v!==undefined).forEach(v=>expect(v).toBeCloseTo(10,4))})
})
describe('Volume Profile',()=>{
  it('returns correct bucket count',()=>{expect(calculateVolumeProfile([110,112,108],[105,107,103],[1000,2000,500],10)).toHaveLength(10)})
  it('exactly one point of control',()=>{expect(calculateVolumeProfile([110,112,108],[105,107,103],[1000,2000,500],10).filter(b=>b.isPointOfControl)).toHaveLength(1)})
  it('volume conserved',()=>{const r=calculateVolumeProfile([110,112,108],[105,107,103],[1000,2000,500],10);expect(r.reduce((a,b)=>a+b.volume,0)).toBeCloseTo(3500,0)})
  it('empty input returns empty',()=>{expect(calculateVolumeProfile([],[],[],10)).toHaveLength(0)})
})
