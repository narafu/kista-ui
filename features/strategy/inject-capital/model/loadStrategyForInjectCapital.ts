import { listStrategies, supportsCapitalInjection } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'

// 자금 추가 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 전략 조회.
// features/strategy/reconfigure-vr의 로더와 로직이 같지만 feature 슬라이스끼리 cross-import가 금지돼 신규로 둔다.
// 조회 실패는 그대로 던져 오류 경계가 처리한다(404로 위장하지 않음). 없거나 미지원 전략이면 null.
export async function loadStrategyForInjectCapital(
  accountId: string,
  strategyId: string,
  token: string,
): Promise<Strategy | null> {
  const strategy = (await listStrategies(accountId, token)).find((s) => s.id === strategyId)
  return strategy && supportsCapitalInjection(strategy) ? strategy : null
}
