# Performance Report — Stock Screener Pro

## What was measured
Filter engine (`filterStocks`) on the full 5,000-stock universe: filter + selectivity ordering + sort.
Node v22, single core, Vitest/jsdom, 30 runs per scenario (pure function, no React rendering).

| Scenario | Matches | Median | p95 | Max |
|---|---|---|---|---|
| No filters (sort only) | 5,000 | 1.33 ms | 2.81 ms | 6.29 ms |
| Preset: Value Stocks | 33 | 0.36 ms | 4.58 ms | 4.62 ms |
| Preset: Growth Momentum | 68 | 0.49 ms | 1.74 ms | 2.99 ms |
| Preset: Large Cap Quality | 42 | 0.30 ms | 0.39 ms | 0.72 ms |
| Preset: Technical Breakout | 489 | 0.59 ms | 1.02 ms | 1.17 ms |
| Preset: High Dividend | 187 | 0.39 ms | 0.72 ms | 0.77 ms |
| Preset: IT Sector | 196 | 0.57 ms | 0.66 ms | 0.95 ms |
| All 22 preset filters stacked | — | 0.38 ms | 0.54 ms | 0.75 ms |

Mock data generation for 5,000 stocks: ~78 ms (server-side, cached for 5 minutes).

**Result:** the <200 ms filter target is met with a very large margin (worst case ~6 ms).

## Design choices behind these numbers
- Predicates are ordered by selectivity and AND-ed with short-circuiting.
- Rows are virtualised (TanStack Virtual, fixed 36 px rows, overscan 12) so only visible rows are in the DOM.
- Price/change cells are `React.memo` and subscribe only to their own symbol's live price.
- Live ticks (50 stocks / 2 s) are buffered and flushed once per animation frame.

## NOT yet measured (fill in from a real browser run)
- Lighthouse score / initial load time (README target: < 2.5 s)
- Scroll FPS with 5,000 rows (README target: 60 FPS) — use Chrome DevTools Performance panel
- Bundle size — `ANALYZE=true next build` (`@next/bundle-analyzer` is installed)

## Reproduce
`npm test` runs the correctness suite. The timings above come from calling `filterStocks(generateMockStocks(5000, true), filters, sort)` 30 times per scenario.
