import type { Stock } from '@/types/stock'

/** Every word typed must appear in the symbol, company name, group, sector or country (case-insensitive). */
export function searchStocks(stocks: Stock[], query: string): Stock[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return stocks
  return stocks.filter(s => {
    const text = (s.symbol + ' ' + s.symbol.replace(/\.US$/, '') + ' ' + s.companyName + ' ' + (s.group ?? '') + ' ' + s.sector + ' ' + (s.country ?? '')).toLowerCase()
    return words.every(w => text.includes(w))
  })
}
