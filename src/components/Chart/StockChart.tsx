'use client'
import React,{useRef,useEffect,useState,useCallback}from 'react'
import{useStockStore}from '@/stores/stockStore'
import type{OHLCV}from '@/types/stock'
import{calculateSMA,calculateEMA,calculateBollinger,calculateRSI,toIndicatorPoints}from '@/lib/indicators'
type IChart=import('lightweight-charts').IChartApi
type ISeries=import('lightweight-charts').ISeriesApi<any>
type Timeframe='1M'|'3M'|'6M'|'1Y'|'ALL'
type IKey='SMA20'|'SMA50'|'SMA200'|'EMA12'|'EMA26'|'BB'
const TF_DAYS:Record<Timeframe,number>={'1M':30,'3M':90,'6M':180,'1Y':365,'ALL':9999}
const IND_COLORS:Record<IKey,string>={SMA20:'#3B82F6',SMA50:'#F97316',SMA200:'#8B5CF6',EMA12:'#06B6D4',EMA26:'#EC4899',BB:'#3B82F6'}
import{currencySign}from '@/lib/currency'
interface Props{symbol:string;companyName:string;candles:OHLCV[];height?:number}
export function StockChart({symbol,companyName,candles,height=420}:Props){
  const cur=currencySign(symbol)
  const mainRef=useRef<HTMLDivElement>(null),rsiRef=useRef<HTMLDivElement>(null)
  const chartRef=useRef<IChart|null>(null),rsiChartRef=useRef<IChart|null>(null)
  const seriesRef=useRef<Map<string,ISeries>>(new Map())
  const livePrice=useStockStore(s=>s.livePrices.get(symbol))
  const[tf,setTf]=useState<Timeframe>('1Y')
  const[inds,setInds]=useState<Set<IKey>>(new Set<IKey>(['SMA20','SMA50','BB'] as IKey[]))
  const[showTable,setShowTable]=useState(false)
  const[loading,setLoading]=useState(true)
  const vis=tf==='ALL'?candles:candles.filter(c=>c.time>=Date.now()/1000-TF_DAYS[tf]!*86400)
  const closes=vis.map(c=>c.close),highs=vis.map(c=>c.high),lows=vis.map(c=>c.low),times=vis.map(c=>c.time)
  const toggleInd=useCallback((k:IKey)=>setInds(p=>{const n=new Set(p);n.has(k)?n.delete(k):n.add(k);return n}),[])
  useEffect(()=>{
    if(!mainRef.current||!rsiRef.current)return
    let gone=false
    import('lightweight-charts').then(({createChart,CrosshairMode})=>{
      if(gone||!mainRef.current||!rsiRef.current)return
      const theme={layout:{background:{color:'transparent'},textColor:'#6B7280'},grid:{vertLines:{color:'#F3F4F6'},horzLines:{color:'#F3F4F6'}},crosshair:{mode:CrosshairMode.Normal},timeScale:{timeVisible:true,secondsVisible:false,borderColor:'#E5E7EB'},rightPriceScale:{borderColor:'#E5E7EB'}}
      const chart=createChart(mainRef.current!,{...theme,width:mainRef.current!.clientWidth,height:height-130})
      chartRef.current=chart
      const cs=chart.addCandlestickSeries({upColor:'#22C55E',downColor:'#EF4444',borderUpColor:'#16A34A',borderDownColor:'#DC2626',wickUpColor:'#16A34A',wickDownColor:'#DC2626'})
      seriesRef.current.set('candle',cs)
      const vs=chart.addHistogramSeries({color:'#94A3B8',priceFormat:{type:'volume'},priceScaleId:'vol'})
      seriesRef.current.set('volume',vs)
      const rc=createChart(rsiRef.current!,{...theme,width:rsiRef.current!.clientWidth,height:90,timeScale:{visible:false}})
      rsiChartRef.current=rc
      seriesRef.current.set('rsi',rc.addLineSeries({color:'#8B5CF6',lineWidth:1}))
      seriesRef.current.set('ob',rc.addLineSeries({color:'#EF4444',lineWidth:1,lineStyle:2}))
      seriesRef.current.set('os',rc.addLineSeries({color:'#22C55E',lineWidth:1,lineStyle:2}))
      const ro=new ResizeObserver(()=>{if(mainRef.current)chart.applyOptions({width:mainRef.current.clientWidth});if(rsiRef.current)rc.applyOptions({width:rsiRef.current.clientWidth})})
      if(mainRef.current)ro.observe(mainRef.current);if(rsiRef.current)ro.observe(rsiRef.current)
      setLoading(false)
      return()=>ro.disconnect()
    })
    return()=>{gone=true;chartRef.current?.remove();chartRef.current=null;rsiChartRef.current?.remove();rsiChartRef.current=null;seriesRef.current.clear()}
  },[height])
  useEffect(()=>{
    const chart=chartRef.current;if(!chart||!vis.length)return
    seriesRef.current.get('candle')?.setData(vis.map(c=>({time:c.time as any,open:c.open,high:c.high,low:c.low,close:c.close})))
    seriesRef.current.get('volume')?.setData(vis.map(c=>({time:c.time as any,value:c.volume,color:c.close>=c.open?'#BBF7D0':'#FECACA'})))
    const keep=new Set(['candle','volume','rsi','ob','os'])
    seriesRef.current.forEach((s,k)=>{if(!keep.has(k)){try{chart.removeSeries(s)}catch{}};});keep.forEach(k=>{}); Array.from(seriesRef.current.keys()).filter(k=>!keep.has(k)).forEach(k=>{try{chart.removeSeries(seriesRef.current.get(k)!)}catch{};seriesRef.current.delete(k)})
    const addLine=(k:string,color:string,width=1,title='')=>{const s=chart.addLineSeries({color,lineWidth:width as any,title});seriesRef.current.set(k,s);return s}
    if(inds.has('SMA20')){const d=toIndicatorPoints(calculateSMA(closes,20),times);(seriesRef.current.get('SMA20')??addLine('SMA20',IND_COLORS.SMA20,1,'SMA20')).setData(d.map(p=>({time:p.time as any,value:p.value})))}
    if(inds.has('SMA50')){const d=toIndicatorPoints(calculateSMA(closes,50),times);(seriesRef.current.get('SMA50')??addLine('SMA50',IND_COLORS.SMA50,1,'SMA50')).setData(d.map(p=>({time:p.time as any,value:p.value})))}
    if(inds.has('SMA200')){const d=toIndicatorPoints(calculateSMA(closes,200),times);(seriesRef.current.get('SMA200')??addLine('SMA200',IND_COLORS.SMA200,1,'SMA200')).setData(d.map(p=>({time:p.time as any,value:p.value})))}
    if(inds.has('EMA12')){const d=toIndicatorPoints(calculateEMA(closes,12),times);(seriesRef.current.get('EMA12')??addLine('EMA12',IND_COLORS.EMA12,1,'EMA12')).setData(d.map(p=>({time:p.time as any,value:p.value})))}
    if(inds.has('EMA26')){const d=toIndicatorPoints(calculateEMA(closes,26),times);(seriesRef.current.get('EMA26')??addLine('EMA26',IND_COLORS.EMA26,1,'EMA26')).setData(d.map(p=>({time:p.time as any,value:p.value})))}
    if(inds.has('BB')){
      const vals=calculateBollinger(closes,20)
      const upper:any[]=[],mid:any[]=[],lower:any[]=[]
      vals.forEach((v,i)=>{if(v&&times[i]){upper.push({time:times[i],value:v.upper});mid.push({time:times[i],value:v.middle});lower.push({time:times[i],value:v.lower})}})
      if(!seriesRef.current.has('BB_u')){addLine('BB_u','rgba(59,130,246,0.7)',1,'BB+');addLine('BB_m','rgba(59,130,246,0.4)',1);addLine('BB_l','rgba(59,130,246,0.7)',1,'BB-')}
      seriesRef.current.get('BB_u')?.setData(upper);seriesRef.current.get('BB_m')?.setData(mid);seriesRef.current.get('BB_l')?.setData(lower)
    }
    const rsiData=toIndicatorPoints(calculateRSI(closes,14),times)
    seriesRef.current.get('rsi')?.setData(rsiData.map(d=>({time:d.time as any,value:d.value})))
    if(rsiData.length>0){const t1=rsiData[0]!.time as any,t2=rsiData[rsiData.length-1]!.time as any;seriesRef.current.get('ob')?.setData([{time:t1,value:70},{time:t2,value:70}]);seriesRef.current.get('os')?.setData([{time:t1,value:30},{time:t2,value:30}])}
    chart.timeScale().fitContent()
  },[vis.length,inds,tf])
  useEffect(()=>{
    if(!livePrice||!seriesRef.current.has('candle')||!vis.length)return
    const last=vis[vis.length-1]!
    seriesRef.current.get('candle')?.update({time:last.time as any,open:last.open,high:Math.max(last.high,livePrice.lastPrice),low:Math.min(last.low,livePrice.lastPrice),close:livePrice.lastPrice})
  },[livePrice?.lastPrice])
  const last=vis[vis.length-1]
  const change=livePrice?.changePercent??0, price=livePrice?.lastPrice??last?.close??0
  return(
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-900 dark:text-white font-mono">{symbol}</span>
            <span className={`text-xs font-semibold ${change>=0?'text-green-600':'text-red-500'}`}>{change>=0?'▲':'▼'} {Math.abs(change).toFixed(2)}%</span>
          </div>
          <p className="text-xs text-gray-500 truncate max-w-[180px]">{companyName}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{cur}{price.toFixed(2)}</p>
          <button onClick={()=>setShowTable(t=>!t)} className="text-xs text-blue-500 hover:text-blue-700">{showTable?'Chart':'Table'}</button>
        </div>
      </div>
      <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 dark:border-gray-800 flex-wrap">
        {(['1M','3M','6M','1Y','ALL']as Timeframe[]).map(t=>(
          <button key={t} onClick={()=>setTf(t)} className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${tf===t?'bg-blue-500 text-white':'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'}`}>{t}</button>
        ))}
        <div className="ml-auto flex items-center gap-1 flex-wrap">
          {(['SMA20','SMA50','SMA200','EMA12','EMA26','BB']as IKey[]).map(k=>(
            <button key={k} onClick={()=>toggleInd(k)} className={`px-1.5 py-0.5 text-xs rounded border transition-colors ${inds.has(k)?'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-300':'border-gray-200 dark:border-gray-700 text-gray-400'}`}>{k}</button>
          ))}
        </div>
      </div>
      {showTable?(
        <div className="flex-1 overflow-auto p-4">
          <table className="w-full text-xs" aria-label={`${symbol} price history`}>
            <thead><tr className="border-b border-gray-200 dark:border-gray-700">{['Date','Open','High','Low','Close','Volume'].map(h=><th key={h} className="text-left py-1.5 pr-4 font-semibold text-gray-600 dark:text-gray-400">{h}</th>)}</tr></thead>
            <tbody>
              {[...vis].reverse().slice(0,50).map((c,i)=>(
                <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="py-1 pr-4 font-mono text-gray-600 dark:text-gray-400">{new Date(c.time*1000).toLocaleDateString('en-IN')}</td>
                  <td className="py-1 pr-4 font-mono">{cur}{c.open.toFixed(2)}</td>
                  <td className="py-1 pr-4 font-mono text-green-600">{cur}{c.high.toFixed(2)}</td>
                  <td className="py-1 pr-4 font-mono text-red-500">{cur}{c.low.toFixed(2)}</td>
                  <td className={`py-1 pr-4 font-mono font-medium ${c.close>=c.open?'text-green-600':'text-red-500'}`}>{cur}{c.close.toFixed(2)}</td>
                  <td className="py-1 font-mono text-gray-500">{(c.volume/1e5).toFixed(2)}L</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ):(
        <div className="flex-1 flex flex-col min-h-0">
          {loading&&<div className="flex-1 flex items-center justify-center"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>}
          <div ref={mainRef} className="flex-1" style={{opacity:loading?0:1}}/>
          <div className="border-t border-gray-100 dark:border-gray-800">
            <p className="px-4 py-0.5 text-xs text-gray-400 font-medium">RSI (14)</p>
            <div ref={rsiRef}/>
          </div>
        </div>
      )}
      {livePrice&&<div className="sr-only" aria-live="polite" aria-atomic="true">{symbol}: Price {livePrice.lastPrice.toFixed(2)}, {livePrice.changePercent>=0?'up':'down'} {Math.abs(livePrice.changePercent).toFixed(2)} percent</div>}
    </div>
  )
}




