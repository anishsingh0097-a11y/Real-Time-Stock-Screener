export function formatIndianNumber(value: number): string {
  const a = Math.abs(value), s = value < 0 ? '-' : ''
  if (a >= 1e7) return `${s}${(a/1e7).toFixed(2)}Cr`
  if (a >= 1e5) return `${s}${(a/1e5).toFixed(2)}L`
  if (a >= 1e3) return `${s}${(a/1e3).toFixed(2)}K`
  return `${s}${a.toFixed(2)}`
}
export function formatMarketCap(crore: number): string {
  if (crore >= 1e5) return `${(crore/1e5).toFixed(2)}L Cr`
  if (crore >= 1e3) return `${(crore/1e3).toFixed(2)}K Cr`
  return `${crore.toFixed(0)} Cr`
}
export function formatPrice(value: number, currency: 'INR' | 'USD' = 'INR'): string {
  return new Intl.NumberFormat(currency === 'USD' ? 'en-US' : 'en-IN',{style:'currency',currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(value)
}
export function formatVolume(value: number): string { return formatIndianNumber(value) }
export function formatChangePercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}
export function formatPE(value: number|null): string {
  if (value === null) return 'N/A'
  if (value < 0) return 'Neg'
  return value.toFixed(1)
}
export function formatDecimal(value: number, decimals = 2): string { return value.toFixed(decimals) }
