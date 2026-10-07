import { describe, it, expect } from 'vitest'
import { searchStocks } from '@/lib/search'
import { generateMockStock } from '@/test-utils/mockData'

const stocks = [
  generateMockStock({ symbol: 'TCS', companyName: 'Tata Consultancy Services', group: 'Tata' }),
  generateMockStock({ symbol: 'RELIANCE', companyName: 'Reliance Industries', group: 'Reliance (Jio)' }),
  generateMockStock({ symbol: 'AAPL.US', companyName: 'Apple Inc.', group: 'World' }),
]
describe('searchStocks', () => {
  it('matches company name, symbol and group, ignoring case', () => {
    expect(searchStocks(stocks, 'tata').map(s => s.symbol)).toEqual(['TCS'])
    expect(searchStocks(stocks, 'RELI').map(s => s.symbol)).toEqual(['RELIANCE'])
    expect(searchStocks(stocks, 'jio').map(s => s.symbol)).toEqual(['RELIANCE'])
  })
  it('finds US symbols without typing .US', () => expect(searchStocks(stocks, 'aapl')).toHaveLength(1))
  it('needs every word to match', () => {
    expect(searchStocks(stocks, 'tata services')).toHaveLength(1)
    expect(searchStocks(stocks, 'tata apple')).toHaveLength(0)
  })
  it('returns everything for an empty query', () => expect(searchStocks(stocks, '  ')).toHaveLength(3))
})
