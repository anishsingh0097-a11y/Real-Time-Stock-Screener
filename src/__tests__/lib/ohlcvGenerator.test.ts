import { describe, it, expect } from 'vitest'
import { generateOHLCV, alignToPrice, getOrGenerateOHLCV } from '@/lib/ohlcvGenerator'

describe('ohlcvGenerator - alignToPrice', () => {
  it('makes the final close equal the target price', () => {
    const out = alignToPrice(generateOHLCV(100, 120), 2500)
    expect(out[out.length - 1]!.close).toBeCloseTo(2500, 1)
  })
  it('keeps high >= low and candle shape after scaling', () => {
    for (const c of alignToPrice(generateOHLCV(100, 120), 37.5)) {
      expect(c.high).toBeGreaterThanOrEqual(c.low)
    }
  })
  it('returns input unchanged for empty data or invalid price', () => {
    expect(alignToPrice([], 100)).toEqual([])
    const c = generateOHLCV(100, 10)
    expect(alignToPrice(c, 0)).toBe(c)
  })
  it('getOrGenerateOHLCV ends at the stock price', () => {
    const c = getOrGenerateOHLCV('TESTSYM', 1234.5)
    expect(c[c.length - 1]!.close).toBeCloseTo(1234.5, 1)
  })
})
