import { describe, it, expect, vi } from 'vitest'

const { tick } = vi.hoisted(() => ({ tick: (i: number) => 'Q' + [3, 2, 1, 0].map(k => String.fromCharCode(65 + (Math.floor(i / 26 ** k) % 26))).join('') }))

vi.mock('@/constants/nseListed.json', () => ({ default: Array.from({ length: 2100 }, (_, i) => ({ symbol: `IN${i}`, name: `India Co ${i} Ltd` })) }))
vi.mock('@/constants/worldListed.json', () => ({
  default: [{ s: 'AAPL', n: 'Apple Inc.', m: 4e12, k: 'Technology', c: 'United States' }, { s: 'MSFT', n: 'Microsoft Corporation', m: 3e12, k: 'Technology', c: 'United States' }, ...Array.from({ length: 3500 }, (_, i) => ({ s: tick(i), n: `World Co ${i}`, m: 5e9 - i * 1e6, k: 'Technology', c: i % 2 ? 'Canada' : 'United States' }))],
}))

import { generateMockStocks } from '@/lib/mockDataGenerator'

describe('universe: India first, world fills to 5000', () => {
  const s = generateMockStocks(5000, true)
  it('totals 5000 with unique symbols and no placeholders', () => {
    expect(s).toHaveLength(5000)
    expect(new Set(s.map(x => x.symbol)).size).toBe(5000)
    expect(s.every(x => x.isReal)).toBe(true)
  })
  it('keeps every Indian company (curated + NSE) and fills the rest with USA', () => {
    const india = s.filter(x => x.country === 'India'), usa = s.filter(x => x.country !== 'India')
    expect(india.length).toBeGreaterThanOrEqual(2100)
    expect(india.length + usa.length).toBe(5000)
    expect(usa.every(x => x.symbol.endsWith('.US'))).toBe(true)
    expect(new Set(usa.map(x => x.country))).toEqual(new Set(['USA', 'Canada']))
    expect(s.slice(0, india.length).every(x => x.country === 'India')).toBe(true)
  })
  it('fills the world slots by market cap, largest first', () => {
    const usa = s.filter(x => x.country !== 'India')
    expect(usa[0]!.symbol).toBe('AAPL.US'); expect(usa[1]!.symbol).toBe('MSFT.US')
    expect(usa[0]!.group).toBe('World')
  })
})
