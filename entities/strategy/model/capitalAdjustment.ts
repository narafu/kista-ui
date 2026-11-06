import type { Strategy } from './types'

// 투자금 추가·인출은 진행 중 사이클이 있는 PRIVACY·INFINITE·DCA만 지원한다
export const supportsCapitalAdjustment = (strategy: Pick<Strategy, 'type' | 'cycleInProgress'>) =>
  strategy.cycleInProgress && (strategy.type === 'PRIVACY' || strategy.type === 'INFINITE' || strategy.type === 'DCA')

// 센트 미만 절사 — 장부 예수금이 인출 한도·표시 모두에서 같은 값을 쓰게 한다(toFixed(6)은 x*100의 부동소수 오차 제거용)
export const floorToCents = (n: number) => Math.floor(Number((n * 100).toFixed(6))) / 100

// 인출은 장부 예수금(절사)이 0 초과일 때만 — 값을 모르면(undefined) 서버 검증에 맡기고 허용한다
export const canWithdrawCapital = (strategy: Pick<Strategy, 'type' | 'cycleInProgress' | 'ledgerDeposit'>) =>
  supportsCapitalAdjustment(strategy) &&
  (strategy.ledgerDeposit == null || floorToCents(strategy.ledgerDeposit) > 0)
