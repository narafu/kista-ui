export interface TradeEvent {
  kind: 'BUY' | 'SELL' | 'INFO' | 'FAIL'
  ticker: string
  qty?: number
  price?: number
  amount?: number
  time: string
  accountNickname: string
  message?: string
}
