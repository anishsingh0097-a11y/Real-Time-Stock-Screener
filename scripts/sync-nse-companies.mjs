// Downloads NSE's official list of listed equities and writes src/constants/nseListed.json.
//   npm run sync:companies                 (needs internet)
//   npm run sync:companies -- path/to/EQUITY_L.csv   (use a CSV you downloaded manually)
import { readFileSync, writeFileSync } from 'node:fs'
const URL_ = 'https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv'
const out = new URL('../src/constants/nseListed.json', import.meta.url)

export function parseCsvLine(line) {
  const cells = []; let cur = '', q = false
  for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = '' } else cur += ch }
  cells.push(cur); return cells.map(c => c.trim())
}
const tidy = n => n.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\bLimited\b/g, 'Ltd').replace(/\s+/g, ' ')
export function parseEquityCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean)
  const head = parseCsvLine(lines[0]).map(h => h.toUpperCase())
  const iS = head.indexOf('SYMBOL'), iN = head.findIndex(h => h.startsWith('NAME')), iSeries = head.findIndex(h => h.includes('SERIES'))
  if (iS < 0 || iN < 0) throw new Error('Unexpected CSV header: ' + head.join('|'))
  const rows = lines.slice(1).map(parseCsvLine).filter(r => iSeries < 0 || r[iSeries] === 'EQ')
  return rows.map(r => ({ symbol: r[iS], name: tidy(r[iN]) })).filter(r => /^[A-Z0-9&-]{1,20}$/.test(r.symbol)).sort((a, b) => a.symbol.localeCompare(b.symbol))
}

// ---- World list: github.com/rreichel3/US-Stock-Symbols (NASDAQ + NYSE + AMEX screener data: name, market cap, sector, country) ----
const BAD = /warrant|\brights?\b|\bunits?\b|preferred|notes due|depositary shares each|subordinated|beneficial interest|% |\betf\b|\bfund\b|\btrust\b/i
const GH = 'https://raw.githubusercontent.com/rreichel3/US-Stock-Symbols/main/'
export function parseUsFull(rows) {
  const out = []
  for (const r of rows) {
    const symbol = String(r.symbol ?? '').trim().replace('/', '-')
    const m = Number(r.marketCap)
    if (!/^[A-Z]{1,5}(-[A-Z])?$/.test(symbol) || !(m > 0) || BAD.test(r.name ?? '')) continue
    const name = String(r.name).replace(/\s+(common stock|common shares|ordinary shares|american depositary shares|class [a-z]\b.*)$/i, '').trim()
    out.push({ s: symbol, n: name, m: Math.round(m), k: r.sector || '', c: r.country || '' })
  }
  return out
}

const arg = k => process.argv.find(a => a.startsWith(`--${k}=`))?.split('=')[1]
const get = async (url, local) => {
  if (local) return readFileSync(local, 'utf8')
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: '*/*', Referer: 'https://www.nseindia.com/' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`)
  return res.text()
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  let failed = false
  const positional = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : undefined
  try {
    const list = parseEquityCsv(await get(URL_, arg('nse') ?? positional))
    writeFileSync(out, JSON.stringify(list)); console.log(`India : ${list.length} NSE-listed companies -> src/constants/nseListed.json`)
  } catch (e) { failed = true; console.error(`India : FAILED (${e.message}). Download EQUITY_L.csv from nseindia.com and run: npm run sync:companies -- --nse=path\\EQUITY_L.csv`) }
  try {
    const parts = await Promise.all(['nasdaq/nasdaq', 'nyse/nyse', 'amex/amex'].map(async f => JSON.parse(await get(`${GH}${f}_full_tickers.json`, arg(f.split('/')[0])))))
    const seen = new Set(), list = parts.flatMap(parseUsFull).filter(r => !seen.has(r.s) && seen.add(r.s)).sort((x, y) => y.m - x.m)
    writeFileSync(new URL('../src/constants/worldListed.json', import.meta.url), JSON.stringify(list)); console.log(`World : ${list.length} companies (NASDAQ/NYSE/AMEX, with market cap + sector) -> src/constants/worldListed.json`)
  } catch (e) { failed = true; console.error(`World : FAILED (${e.message}). Download the 3 *_full_tickers.json files from github.com/rreichel3/US-Stock-Symbols and run: npm run sync:companies -- --nasdaq=a.json --nyse=b.json --amex=c.json`) }
  process.exit(failed ? 1 : 0)
}
