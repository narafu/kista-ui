import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

// VR 재설정 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 계좌·전략 조회.
// features/strategy/create-strategy의 loadAccountAndStrategyForEdit와 로직은 동일하지만
// FSD 규칙상 feature 슬라이스끼리 cross-import가 금지돼 신규로 둔다.
export async function loadAccountAndStrategyForReconfigure(
  accountId: string,
  strategyId: string,
  token: string,
): Promise<{ account: Account; strategy: Strategy } | null> {
  const [accounts, strategies] = await Promise.all([
    listAccounts(token).catch((): Account[] => []),
    listStrategies(accountId, token).catch((): Strategy[] => []),
  ])
  const account = accounts.find((a) => a.id === accountId)
  const strategy = strategies.find((s) => s.id === strategyId)
  if (!account || !strategy || !strategy.vr) return null
  return { account, strategy }
}
