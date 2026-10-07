import type { Stock, FilterConfig, SortConfig } from '@/types/stock'
type Predicate = (stock: Stock) => boolean
function buildPredicate(filter: FilterConfig): Predicate {
  const { field, operator, value } = filter
  return (stock: Stock): boolean => {
    const v = stock[field]
    if (v === null || v === undefined) return operator === 'eq' && value === null
    switch (operator) {
      case 'eq':   return v === value
      case 'neq':  return v !== value
      case 'gt':   return typeof v === 'number' && typeof value === 'number' && v > value
      case 'gte':  return typeof v === 'number' && typeof value === 'number' && v >= value
      case 'lt':   return typeof v === 'number' && typeof value === 'number' && v < value
      case 'lte':  return typeof v === 'number' && typeof value === 'number' && v <= value
      case 'between': {
        if (!Array.isArray(value) || value.length < 2) return true
        const [mn, mx] = value as number[]
        return typeof v === 'number' && v >= (mn ?? -Infinity) && v <= (mx ?? Infinity)
      }
      case 'in': {
        const arr = value as (string|number)[]
        if (!Array.isArray(arr) || arr.length === 0) return true
        if (Array.isArray(v)) return (v as string[]).some(x => arr.includes(x))
        return arr.includes(v as string|number)
      }
      case 'notIn': {
        const arr = value as (string|number)[]
        if (!Array.isArray(arr) || arr.length === 0) return true
        return !arr.includes(v as string|number)
      }
      default: return true
    }
  }
}
function selectivity(f: FilterConfig): number {
  switch (f.operator) {
    case 'between': case 'gt': case 'gte': case 'lt': case 'lte': return 1
    case 'eq': return 2
    case 'in': return 3 + (Array.isArray(f.value) ? (f.value as unknown[]).length : 5)
    case 'notIn': return 4
    default: return 10
  }
}
function stableSort(stocks: Stock[], cfg: SortConfig): Stock[] {
  const m = cfg.direction === 'asc' ? 1 : -1
  return [...stocks].sort((a, b) => {
    const av = a[cfg.column], bv = b[cfg.column]
    if (av === null || av === undefined) return 1
    if (bv === null || bv === undefined) return -1
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * m
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * m
    return 0
  })
}
export interface FilterResult { stocks: Stock[]; total: number; filteredCount: number; executionTimeMs: number }
export function filterStocks(allStocks: Stock[], filters: FilterConfig[], sortConfig: SortConfig): FilterResult {
  const start = performance.now()
  const active = filters.filter(f => f.enabled)
  let result: Stock[]
  if (active.length === 0) {
    result = stableSort(allStocks, sortConfig)
  } else {
    const sorted = [...active].sort((a, b) => selectivity(a) - selectivity(b))
    const preds = sorted.map(f => buildPredicate(f))
    const filtered: Stock[] = []
    for (const stock of allStocks) {
      let pass = true
      for (const pred of preds) { if (!pred(stock)) { pass = false; break } }
      if (pass) filtered.push(stock)
    }
    result = stableSort(filtered, sortConfig)
  }
  return { stocks: result, total: allStocks.length, filteredCount: result.length, executionTimeMs: performance.now() - start }
}
export function countMatching(allStocks: Stock[], filters: FilterConfig[]): number {
  const active = filters.filter(f => f.enabled)
  if (active.length === 0) return allStocks.length
  const preds = active.map(f => buildPredicate(f))
  return allStocks.filter(s => preds.every(p => p(s))).length
}
