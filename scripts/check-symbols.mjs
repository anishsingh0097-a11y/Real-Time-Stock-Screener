// Verifies every real company ticker in src/constants/SECTORS.ts against the live price feed.
// Run on your own machine (needs internet):  npm run check:symbols
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../src/constants/SECTORS.ts', import.meta.url), 'utf8')
const rows = [...src.matchAll(/\{symbol:'([^']+)',name:'([^']+)'/g)].map(m => ({ symbol: m[1], name: m[2] }))
const base = process.env.QUOTE_API_BASE ?? 'https://query1.finance.yahoo.com/v8/finance/chart/'
let i = 0; const bad = []
async function one({ symbol, name }) {
  try {
    const r = await fetch(`${base}${encodeURIComponent(symbol)}.NS?interval=1d&range=5d`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(8000) })
    const meta = (await r.json())?.chart?.result?.[0]?.meta
    if (!r.ok || !meta?.regularMarketPrice) throw new Error(`HTTP ${r.status}`)
    console.log(`OK       ${symbol.padEnd(12)} ${String(meta.regularMarketPrice).padStart(10)}  ${name}`)
  } catch (e) { bad.push(symbol); console.log(`MISSING  ${symbol.padEnd(12)} ${name}  (${e.message})`) }
}
await Promise.all(Array.from({ length: 5 }, async () => { while (i < rows.length) await one(rows[i++]) }))
console.log(`\n${rows.length - bad.length}/${rows.length} symbols OK`)
if (bad.length) console.log('Fix or remove in src/constants/SECTORS.ts:', bad.join(', '))
process.exit(bad.length ? 1 : 0)
