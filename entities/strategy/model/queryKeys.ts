import type { DcaExecutionFilters } from './types'

export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  listAll: () => [...strategyKeys.lists(), 'all'] as const,
  // 통계용 — 보관 전략 포함. lists() 하위라 목록 무효화에 함께 걸린다
  listAllWithArchived: () => [...strategyKeys.lists(), 'all-with-archived'] as const,
  listByAccount: (accountId: string) => [...strategyKeys.lists(), 'account', accountId] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
  dcaExecutionsAll: () => [...strategyKeys.all, 'dca-executions'] as const,
  dcaExecutions: (id: string, page: number, size: number, filters?: DcaExecutionFilters) => [...strategyKeys.dcaExecutionsAll(), id, page, size, filters ?? {}] as const,
  dcaAvailableCash: (accountId: string, ticker: string) => [...strategyKeys.all, 'dca-available-cash', accountId, ticker] as const,
  // body는 JSON 문자열 — 같은 입력이면 같은 키. 체결 무효화(TradeNotificationBridge) 대상이 아니다
  validation: (target: string, body: string) => [...strategyKeys.all, 'validation', target, body] as const,
}
