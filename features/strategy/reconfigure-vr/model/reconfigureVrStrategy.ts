import type { Strategy, StrategyVrSummary } from '@entities/strategy'

// ReconfigureVrForm은 vr 없는 strategy로는 렌더될 수 없다 — 페이지가 이 가드로 vr 유무를 걸러내
// 폼 props에서부터 vr을 non-optional로 좁혀 호출부의 null 체크(및 Rules of Hooks 위반 위험)를 없앤다.
export type ReconfigureVrStrategy = Strategy & { vr: StrategyVrSummary }

export function hasVr(strategy: Strategy): strategy is ReconfigureVrStrategy {
  return strategy.vr !== undefined
}
