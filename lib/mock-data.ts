import type { User } from '@/types/user'
import type { Account } from '@/types/account'
import type { Strategy } from '@/types/strategy'
import type { TradeHistory, PortfolioSnapshot, ProfitSummary } from '@/types/trade'

export const MOCK_USER: User = {
  id: 'user-001',
  nickname: '홍길동',
  status: 'ACTIVE',
  role: 'USER',
  hasTelegram: false,
  telegramBotUsername: null,
}

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-001',
    nickname: '주계좌',
    accountNoMasked: '****-01',
    broker: 'KIS',
  },
  {
    id: 'acc-002',
    nickname: '테스트 계좌',
    accountNoMasked: '****-02',
    broker: 'KIS',
  },
]

export const MOCK_STRATEGIES: Strategy[] = [
  {
    id: 'str-001',
    accountId: 'acc-001',
    type: 'INFINITE',
    status: 'ACTIVE',
    ticker: 'SOXL',
    cycleSeedType: 'NONE',
  },
  {
    id: 'str-002',
    accountId: 'acc-002',
    type: 'PRIVACY',
    status: 'PAUSED',
    ticker: 'SOXL',
    cycleSeedType: 'NONE',
  },
]

export const MOCK_TRADES: TradeHistory[] = [
  {
    id: 'trade-001',
    tradeDate: '2026-04-28',
    ticker: 'SOXL',
    strategy: 'INFINITE',
    orderType: 'LIMIT',
    direction: 'BUY',
    quantity: 10,
    price: 32.5,
    amountUsd: 325.0,
    status: 'FILLED',
    kisOrderId: 'KIS-001',
    createdAt: '2026-04-28T07:00:00Z',
  },
  {
    id: 'trade-002',
    tradeDate: '2026-04-29',
    ticker: 'SOXL',
    strategy: 'INFINITE',
    orderType: 'LIMIT',
    direction: 'SELL',
    quantity: 5,
    price: 35.2,
    amountUsd: 176.0,
    status: 'FILLED',
    kisOrderId: 'KIS-002',
    createdAt: '2026-04-29T07:00:00Z',
  },
]

export const MOCK_PORTFOLIO: PortfolioSnapshot = {
  id: 'snap-001',
  ticker: 'SOXL',
  holdings: 5,
  avgPrice: 32.5,
  currentPrice: 35.2,
  marketValueUsd: 176.0,
  usdDeposit: 1000.0,
  totalAssetUsd: 1176.0,
  createdAt: '2026-04-30T00:00:00Z',
}

export const MOCK_PROFIT_SUMMARY: ProfitSummary = {
  accountId: 'acc-001',
  startDate: '2026-04-01',
  endDate: '2026-04-30',
  totalProfitLoss: 215.5,
  totalProfitLossRate: 12.3,
  dailyProfits: Array.from({ length: 20 }, (_, i) => ({
    date: `2026-04-${String(i + 1).padStart(2, '0')}`,
    profitLoss: (Math.random() - 0.3) * 50,
    profitLossRate: (Math.random() - 0.3) * 5,
  })),
}
