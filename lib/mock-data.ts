import type { User } from '@/types/user'
import type { Account } from '@/types/account'
import type { TradeHistory, PortfolioSnapshot, ProfitSummary } from '@/types/trade'

export const MOCK_USER: User = {
  id: 'user-001',
  kakaoId: '123456789',
  nickname: '홍길동',
  status: 'ACTIVE',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
}

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'acc-001',
    userId: 'user-001',
    nickname: '주계좌',
    accountNo: '****-01',
    kisAppKey: '****',
    kisSecretKey: '****',
    strategy: 'INFINITE',
    strategyStatus: 'ACTIVE',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'acc-002',
    userId: 'user-001',
    nickname: '테스트 계좌',
    accountNo: '****-02',
    kisAppKey: '****',
    kisSecretKey: '****',
    strategy: 'PRIVACY',
    strategyStatus: 'PAUSED',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
]

export const MOCK_TRADES: TradeHistory[] = [
  {
    id: 'trade-001',
    accountId: 'acc-001',
    symbol: 'SOXL',
    side: 'BUY',
    quantity: 10,
    price: 32.5,
    amount: 325.0,
    executedAt: '2026-04-28T07:00:00Z',
  },
  {
    id: 'trade-002',
    accountId: 'acc-001',
    symbol: 'SOXL',
    side: 'SELL',
    quantity: 5,
    price: 35.2,
    amount: 176.0,
    executedAt: '2026-04-29T07:00:00Z',
  },
]

export const MOCK_PORTFOLIO: PortfolioSnapshot = {
  accountId: 'acc-001',
  symbol: 'SOXL',
  quantity: 5,
  avgPrice: 32.5,
  currentPrice: 35.2,
  evaluationAmount: 176.0,
  profitLoss: 13.5,
  profitLossRate: 8.31,
  snapshotAt: '2026-04-30T00:00:00Z',
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
