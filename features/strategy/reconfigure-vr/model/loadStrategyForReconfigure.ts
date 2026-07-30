import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy, StrategyVrSummary } from '@entities/strategy'

// ReconfigureVrForm은 vr 없는 strategy로는 렌더될 수 없다 — 이 로더가 유일한 진입점이며
// vr 유무를 여기서 걸러내므로, 반환 타입에서부터 vr을 non-optional로 좁혀 호출부의
// null 체크(및 그로 인한 Rules of Hooks 위반 위험)를 원천적으로 없앤다.
export type ReconfigureVrStrategy = Strategy & { vr: StrategyVrSummary }

// VR 재설정 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 계좌·전략 조회.
// features/strategy/create-strategy의 loadAccountAndStrategyForEdit와 로직은 동일하지만
// FSD 규칙상 feature 슬라이스끼리 cross-import가 금지돼 신규로 둔다.
export async function loadAccountAndStrategyForReconfigure(
  accountId: string,
  strategyId: string,
  token: string,
): Promise<{ account: Account; strategy: ReconfigureVrStrategy } | null> {
  const [accounts, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    listStrategies(accountId, token).catch((): Strategy[] => []),
  ])
  const account = accounts.find((a) => a.id === accountId)
  const strategy = strategies.find((s) => s.id === strategyId)
  if (!account || !strategy || !strategy.vr) return null
  return { account, strategy: strategy as ReconfigureVrStrategy }
}
