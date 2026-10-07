import type { Stock } from '@/types/stock'

const CSV_COLUMNS: Array<{ key: keyof Stock; label: string; format?: (v: any) => string }> = [
  { key: 'symbol',           label: 'Symbol' },
  { key: 'companyName',      label: 'Company' },
  { key: 'group',            label: 'Group',            format: v => v ?? '' },
  { key: 'sector',           label: 'Sector' },
  { key: 'marketCapCategory',label: 'Cap Category' },
  { key: 'lastPrice',        label: 'LTP (Rs)',         format: v => v.toFixed(2) },
  { key: 'changePercent',    label: '% Change',         format: v => v.toFixed(2) },
  { key: 'volume',           label: 'Volume',           format: v => v.toLocaleString() },
  { key: 'marketCap',        label: 'Market Cap (Cr)',  format: v => v.toFixed(2) },
  { key: 'pe',               label: 'P/E',              format: v => v === null ? 'N/A' : v.toFixed(2) },
  { key: 'pb',               label: 'P/B',              format: v => v.toFixed(2) },
  { key: 'dividendYield',    label: 'Div Yield %',      format: v => v.toFixed(2) },
  { key: 'roe',              label: 'ROE %',            format: v => v.toFixed(2) },
  { key: 'roce',             label: 'ROCE %',           format: v => v.toFixed(2) },
  { key: 'debtToEquity',     label: 'D/E',              format: v => v.toFixed(2) },
  { key: 'promoterHolding',  label: 'Promoter %',       format: v => v.toFixed(2) },
  { key: 'revenueGrowthYoY', label: 'Rev Growth %',     format: v => v.toFixed(2) },
  { key: 'profitGrowthYoY',  label: 'PAT Growth %',     format: v => v.toFixed(2) },
  { key: 'rsi14',            label: 'RSI (14)',          format: v => v.toFixed(1) },
  { key: 'beta',             label: 'Beta',             format: v => v.toFixed(2) },
  { key: 'macdSignal',       label: 'MACD Signal' },
  { key: 'bollingerPosition',label: 'Bollinger Position' },
]

export function exportToCSV(stocks: Stock[], filename = 'screener-results.csv'): void {
  const header = CSV_COLUMNS.map(c => `"${c.label}"`).join(',')

  const rows = stocks.map(stock =>
    CSV_COLUMNS.map(col => {
      const val = stock[col.key]
      const formatted = col.format ? col.format(val) : String(val ?? '')
      return `"${formatted.replace(/"/g, '""')}"`
    }).join(',')
  )

  const csv = [header, ...rows].join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
