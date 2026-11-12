import type { DcaRule, Strategy, StrategyVrSummary } from './types'

export const vrSummary = (over: Partial<StrategyVrSummary> = {}): StrategyVrSummary => ({
  value: 4200, bandWidth: 15, intervalWeeks: 2, recurringAmount: 0, poolLimit: 1000, poolLimitRate: 0.5, gradient: 10,
  initialGradient: 10, gGraceWeeks: 0, gStepWeeks: 4, gMax: 20, initialPoolLimitRate: 0.5, pGraceWeeks: 0, pStepWeeks: 4, poolLimitFloor: 0.25,
  ...over,
})

export const dcaRule = (over: Partial<DcaRule> = {}): DcaRule => ({
  ruleKey: 'a', direction: 'BUY', frequency: 'MONTHLY', dayOfWeek: null, dayOfMonth: null, orderType: 'MOC', executionHour: null,
  sizing: { type: 'AMOUNT', amount: 300, percent: null }, shortfall: 'PARTIAL', conditions: [],
  nextExecution: { usSessionDate: '2026-10-30', kstTradeDate: '2026-10-31' }, lastExecution: null,
  ...over,
})

export const strategy = (over: Partial<Strategy> = {}): Strategy => ({
  id: 's1', accountId: 'a1', type: 'INFINITE', status: 'ACTIVE', ticker: 'TQQQ', cycleSeedType: 'NONE', isReverseMode: false, cycleInProgress: false,
  ...over,
})
