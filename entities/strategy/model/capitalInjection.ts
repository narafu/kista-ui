import type { Strategy } from './types'

// 투자금 추가는 진행 중 사이클이 있는 PRIVACY·INFINITE만 지원한다
export const supportsCapitalInjection = (strategy: Pick<Strategy, 'type' | 'cycleInProgress'>) =>
  strategy.cycleInProgress && (strategy.type === 'PRIVACY' || strategy.type === 'INFINITE')
