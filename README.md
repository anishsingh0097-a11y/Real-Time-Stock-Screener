# Stock Screener Pro

A production-grade real-time Indian equity screener — competitor to Screener.in and Finviz.

## Live Demo`nhttps://YOUR-VERCEL-URL.vercel.app/screener
Run locally: `npm run dev` -> http://localhost:3000/screener

## Features
- 5,000+ NSE/BSE stocks with realistic correlated data
- 30+ filters: Fundamentals, Market Data, Technical, Classification
- **Real live NSE prices** for 100 real Indian companies (Tata, Reliance/Jio Financial, Aditya Birla, Adani, Mahindra, Bajaj, HDFC, ICICI, JSW, PSU banks & energy...), polled every 2s and batched per animation frame; a green dot marks real-priced rows
- Candlestick charts with technical indicators (SMA 20/50/200, EMA 12/26, Bollinger Bands, RSI)
- Virtual scrolling — 60 FPS with 5000 rows
- Dark mode
- CSV export
- 6 preset screeners (Value Stocks, Growth Momentum, etc.)

## Tech Stack
- Next.js 14 (App Router)
- React 18 + TypeScript (strict)
- TanStack Table v8 + TanStack Virtual v3
- Lightweight Charts v4 (TradingView)
- Zustand v5 (state management)
- TanStack Query v5 (server state)
- Tailwind CSS v3
- Vitest + React Testing Library

## Setup
```bash
git clone <repo>
cd stock-screener
npm install
npm run dev
```

## Scripts
```bash
npm run dev      # Development server
npm run build    # Production build
npm test         # Run tests once (76 tests)
npm run lint     # ESLint
```

## Architecture
See ARCHITECTURE.md for component hierarchy and state management diagrams.

## Performance
- Filter response: <200ms for 5000 stocks (measured: 0.3-6 ms, see PERFORMANCE_REPORT.md)
- Virtual scroll: 60 FPS (target, not yet measured)
- Initial load: <2.5s (target, not yet measured)
- Live updates: 2s polling of 50 stocks per tick, flushed per animation frame

## Project Structure
```
src/
  app/          # Next.js App Router pages + API routes
  components/   # React components (DataGrid, Chart, FilterPanel)
  hooks/        # Custom hooks (useFilterEngine, useRealtimePolling)
  lib/          # Core logic (filterEngine, indicators, mockData)
  stores/       # Zustand stores
  types/        # TypeScript interfaces
  utils/        # Formatters, CSV export
  __tests__/    # Vitest test suites
```

## Built By
Anish Kumar — BCA 



https://real-time-stock-screener-pi.vercel.app/screener


## Live prices — how it works
- The 100 companies in `LARGE_CAP_COMPANIES` (`src/constants/SECTORS.ts`, tagged by promoter group) are real NSE stocks. Their price, change %, volume, day high/low and 52-week range come from
  Yahoo Finance's public chart endpoint (`src/lib/realQuotes.ts`, server-side, no API key). Add a symbol to that list to make it live.
- The other ~4,900 rows are generated placeholders with no real market price; they are simulated (set `SIMULATE_SYNTHETIC=false` to freeze them).
- Fundamentals/technicals (P/E, ROE, RSI, market cap...) are still mock data, even for real symbols.
- Server caches quotes for 8 s, so many open tabs do not multiply upstream requests. Failed symbols fall back to their previous price.
- Header status: **Live · N real** (market open), **Market closed** (NSE Mon-Fri 9:15-15:30 IST, exchange holidays not modelled),
  **No live feed** (market open but the feed returned nothing).
- Filter -> Custom -> "Real NSE prices only" shows just the real-priced stocks.
- Yahoo's endpoint is unofficial and may be rate-limited or delayed, especially from cloud IPs. For production use a licensed
  feed (broker API such as Zerodha Kite / Upstox / Angel One, or an exchange data vendor) by replacing `fetchRealQuotes`.
- `QUOTE_API_BASE` env var overrides the endpoint (used for local testing with a fake server).

## Real companies & groups
- The screener opens on **Real Companies** (filter chip at the top; "Clear all" shows the full 5,000-row universe).
- Quick presets: **Tata Group**, **Reliance & Jio**, **Aditya Birla**, **Adani Group**. Also Filters -> Classification -> *Company Group* (Mahindra, Bajaj, HDFC, ICICI, JSW, Godrej, Vedanta, Bharti, Government (PSU), Independent).
- **Jio Platforms is not listed yet** (IPO pending), so there is no ticker. Reliance's listed Jio entity today is Jio Financial Services (`JIOFIN`). When Jio Platforms lists, add its NSE ticker to `LARGE_CAP_COMPANIES` with group `Reliance (Jio)`.
- Tata Motors split in 2025: use `TMPV` (passenger) and `TMCV` (commercial); the old `TATAMOTORS` ticker is retired.
- **Verify tickers on your machine:** `npm run check:symbols` checks all 100 against the live feed and lists any that return no data.

## All NSE-listed companies
- By default the universe is the 100 curated companies plus generated placeholders. To load **every NSE-listed company** (~2,000 real names):
  `npm run sync:companies` (downloads NSE's official `EQUITY_L.csv` into `src/constants/nseListed.json`). If NSE blocks the download,
  save the CSV from nseindia.com manually and run `npm run sync:companies -- path\to\EQUITY_L.csv`.
- Once synced, placeholders are dropped: every row is a real company. Companies outside the curated 100 are grouped as *Other listed*;
  their sector/cap/fundamentals are still mock (NSE's list has only symbol and name).
- Live prices: the 100 curated companies are always polled; for the rest, only the rows visible in the grid (up to 60) are requested each tick,
  so scrolling to a new row gives it a real price within a couple of seconds.

## 5,000 real companies: India + world
- **World (already bundled):** `src/constants/worldListed.json` has 5,100+ real NASDAQ / NYSE / AMEX companies with real market cap, sector and country
  (source: github.com/rreichel3/US-Stock-Symbols; ETFs, warrants, preferreds and companies without a market cap removed). Refresh with `npm run sync:companies`.
- **India (run once on your PC):** `npm run sync:companies` also downloads NSE's official `EQUITY_L.csv` (~2,000 companies) into `src/constants/nseListed.json`.
  If NSE blocks the download, save the CSV from nseindia.com and run `npm run sync:companies -- --nse=path\\EQUITY_L.csv`.
- **Universe = 100 curated Indian companies + all NSE-listed (once synced) first, then world companies by market cap, up to 5,000.**
  Until the India list is synced the grid shows the 100 curated Indian companies and ~4,900 world companies.
- US companies use the symbol `TICKER.US` (no clash with NSE tickers like ABB), show prices in $, and market caps are converted to Rs Cr at an approximate 88 INR/USD.
  Indian ADRs listed in the US (HDB, IBN, WIT...) keep Country = India.
- Filters -> Classification -> Country / Company Group. Header says "Markets closed" only when both NSE and US sessions are closed.
- Sector/cap for non-curated Indian companies and all P/E, ROE, RSI etc. are still mock (NSE's list has only symbol and name).
