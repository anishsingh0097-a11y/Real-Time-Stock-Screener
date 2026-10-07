/** US-listed companies use the app symbol `TICKER.US` (avoids clashes with NSE tickers like ABB / ITC). */
export const isUsSymbol = (symbol: string): boolean => symbol.endsWith('.US')
export const currencyOf = (symbol: string): 'USD' | 'INR' => (isUsSymbol(symbol) ? 'USD' : 'INR')
export const currencySign = (symbol: string): string => (isUsSymbol(symbol) ? '$' : '₹')
