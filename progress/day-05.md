# Day 5 Progress Report
## Date: 2026-06-27

## Tasks Completed
- [x] WebSocket simulation via polling API (/api/ws)
- [x] Geometric Brownian Motion price simulation (50 stocks per tick)
- [x] RAF-batched state updates (no dropped frames)
- [x] Exponential backoff reconnection logic
- [x] Flash animations on price cells (green up, red down)
- [x] Connection status indicator (Live/Connecting/Reconnecting/Offline)
- [x] Live price updates in PriceCell and ChangeCell

## Architecture Decision
Used polling (/api/ws GET every 2s) instead of native WebSocket because
Next.js 14 App Router does not support WebSocket upgrades in route handlers.
This simulates identical behaviour with RAF batching for 60fps rendering.

## Performance
- 50 stocks updated per 2s tick
- RAF batching prevents render storms
- Exponential backoff: 1s, 2s, 4s, 8s, 16s max

## Tomorrow (Day 6)
- Performance optimization
- Lighthouse audit
- Bundle analysis
- Dark mode
