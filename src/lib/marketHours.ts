/** NSE/BSE regular session: Mon-Fri 09:15-15:30 IST. (Exchange holidays are not modelled.) */
export function isNseMarketOpen(date: Date = new Date()): boolean {
  const ist = new Date(date.getTime() + 330 * 60_000) // UTC+5:30
  const day = ist.getUTCDay()
  if (day === 0 || day === 6) return false
  const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes()
  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30
}

/** US regular session: Mon-Fri 09:30-16:00 America/New_York (handles DST; holidays not modelled). */
export function isUsMarketOpen(date: Date = new Date()): boolean {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(date)
  const get = (t: string) => p.find(x => x.type === t)?.value ?? ''
  if (get('weekday') === 'Sat' || get('weekday') === 'Sun') return false
  const m = (Number(get('hour')) % 24) * 60 + Number(get('minute'))
  return m >= 9 * 60 + 30 && m < 16 * 60
}
