import type { Strategy, StrategyAction } from './types'

export type ActionState = { kind: 'hidden' } | { kind: 'allowed' } | { kind: 'blocked'; reasonCode: string }

// 서버 판정(allowedActions ∪ blockedActions = 지원 행위 전체)을 그대로 읽는다 — 둘 다에 없으면 미지원이라 숨긴다
export function actionState(strategy: Pick<Strategy, 'allowedActions' | 'blockedActions'>, action: StrategyAction): ActionState {
  if (strategy.allowedActions.includes(action)) return { kind: 'allowed' }
  const blocked = strategy.blockedActions.find((b) => b.action === action)
  return blocked ? { kind: 'blocked', reasonCode: blocked.reasonCode } : { kind: 'hidden' }
}
