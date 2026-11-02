import type { Strategy } from './types'

// 자금 추가는 PRIVACY·INFINITE만 지원한다
export const supportsCapitalInjection = (strategy: Pick<Strategy, 'type'>) =>
  strategy.type === 'PRIVACY' || strategy.type === 'INFINITE'
