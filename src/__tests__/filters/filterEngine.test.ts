import { describe, it, expect } from 'vitest'
import { filterStocks } from '@/lib/filterEngine'
import { generateMockStock, generateMockStockList } from '@/test-utils/mockData'
const SORT = { column: 'marketCap' as const, direction: 'desc' as const }
describe('Filter Engine - Operators', () => {
  it('gte filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20}),generateMockStock({symbol:'B',roe:10}),generateMockStock({symbol:'C',roe:15})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'roe',operator:'gte',value:15,enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('lte filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',debtToEquity:0.2}),generateMockStock({symbol:'B',debtToEquity:1.5}),generateMockStock({symbol:'C',debtToEquity:0.5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'debtToEquity',operator:'lte',value:0.5,enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('between filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',rsi14:25}),generateMockStock({symbol:'B',rsi14:55}),generateMockStock({symbol:'C',rsi14:75})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'rsi14',operator:'between',value:[30,70],enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('eq filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',sector:'IT'}),generateMockStock({symbol:'B',sector:'Banking'}),generateMockStock({symbol:'C',sector:'IT'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'sector',operator:'eq',value:'IT',enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('in filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',sector:'IT'}),generateMockStock({symbol:'B',sector:'Banking'}),generateMockStock({symbol:'C',sector:'Pharma'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'sector',operator:'in',value:['IT','Banking'],enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','B'])
  })
  it('notIn filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',macdSignal:'Bullish'}),generateMockStock({symbol:'B',macdSignal:'Bearish'}),generateMockStock({symbol:'C',macdSignal:'Neutral'})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'macdSignal',operator:'notIn',value:['Bearish'],enabled:true}],SORT)
    expect(r.map(s=>s.symbol).sort()).toEqual(['A','C'])
  })
  it('gt filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',marketCap:5000}),generateMockStock({symbol:'B',marketCap:10000})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'marketCap',operator:'gt',value:5000,enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('lt filters correctly', () => {
    const stocks=[generateMockStock({symbol:'A',beta:0.8}),generateMockStock({symbol:'B',beta:1.5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'beta',operator:'lt',value:1.0,enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['A'])
  })
})
describe('Filter Engine - Combinatorial', () => {
  it('applies AND logic across multiple filters', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20,debtToEquity:0.2,sector:'IT'}),generateMockStock({symbol:'B',roe:20,debtToEquity:1.5,sector:'IT'}),generateMockStock({symbol:'C',roe:10,debtToEquity:0.2,sector:'IT'}),generateMockStock({symbol:'D',roe:20,debtToEquity:0.2,sector:'Banking'})]
    const filters=[{id:'1',field:'roe' as const,operator:'gte' as const,value:15,enabled:true},{id:'2',field:'debtToEquity' as const,operator:'lte' as const,value:0.5,enabled:true},{id:'3',field:'sector' as const,operator:'eq' as const,value:'IT',enabled:true}]
    const{stocks:r}=filterStocks(stocks,filters,SORT)
    expect(r.map(s=>s.symbol)).toEqual(['A'])
  })
  it('disabled filters are ignored', () => {
    const stocks=[generateMockStock({symbol:'A',roe:20}),generateMockStock({symbol:'B',roe:5})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'roe',operator:'gte',value:15,enabled:false}],SORT)
    expect(r).toHaveLength(2)
  })
  it('empty filters return all stocks', () => {
    const stocks=generateMockStockList(50)
    const{stocks:r}=filterStocks(stocks,[],SORT)
    expect(r).toHaveLength(50)
  })
  it('null pe handled gracefully', () => {
    const stocks=[generateMockStock({symbol:'A',pe:null}),generateMockStock({symbol:'B',pe:20})]
    const{stocks:r}=filterStocks(stocks,[{id:'1',field:'pe',operator:'between',value:[1,30],enabled:true}],SORT)
    expect(r.map(s=>s.symbol)).toEqual(['B'])
  })
  it('filteredCount equals result length', () => {
    const stocks=generateMockStockList(200)
    const{stocks:r,filteredCount}=filterStocks(stocks,[{id:'1',field:'rsi14' as const,operator:'between' as const,value:[30,70],enabled:true}],SORT)
    expect(r.length).toBe(filteredCount)
  })
})
describe('Filter Engine - Performance', () => {
  it('filters 5000 stocks in under 200ms', () => {
    const stocks=generateMockStockList(5000)
    const filters=[{id:'1',field:'marketCap' as const,operator:'gte' as const,value:1000,enabled:true},{id:'2',field:'pe' as const,operator:'between' as const,value:[10,30],enabled:true},{id:'3',field:'roe' as const,operator:'gte' as const,value:12,enabled:true},{id:'4',field:'sector' as const,operator:'in' as const,value:['IT','Banking','Pharma'],enabled:true},{id:'5',field:'debtToEquity' as const,operator:'lte' as const,value:2,enabled:true}]
    const start=performance.now()
    const{executionTimeMs}=filterStocks(stocks,filters,SORT)
    expect(performance.now()-start).toBeLessThan(200)
    expect(executionTimeMs).toBeLessThan(200)
  })
})
describe('Filter Engine - Sort', () => {
  it('sorts descending by marketCap', () => {
    const stocks=[generateMockStock({symbol:'A',marketCap:1000}),generateMockStock({symbol:'B',marketCap:5000}),generateMockStock({symbol:'C',marketCap:3000})]
    const{stocks:r}=filterStocks(stocks,[],{column:'marketCap',direction:'desc'})
    expect(r.map(s=>s.marketCap)).toEqual([5000,3000,1000])
  })
  it('sorts ascending by lastPrice', () => {
    const stocks=[generateMockStock({symbol:'A',lastPrice:500}),generateMockStock({symbol:'B',lastPrice:100}),generateMockStock({symbol:'C',lastPrice:300})]
    const{stocks:r}=filterStocks(stocks,[],{column:'lastPrice',direction:'asc'})
    expect(r.map(s=>s.lastPrice)).toEqual([100,300,500])
  })
  it('nulls go last', () => {
    const stocks=[generateMockStock({symbol:'A',pe:null}),generateMockStock({symbol:'B',pe:20}),generateMockStock({symbol:'C',pe:10})]
    const{stocks:r}=filterStocks(stocks,[],{column:'pe',direction:'asc'})
    expect(r[r.length-1]?.pe).toBeNull()
  })
})
