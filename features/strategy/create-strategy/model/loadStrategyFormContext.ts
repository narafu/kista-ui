import { listAccounts } from '@entities/account'
import { listStrategies } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

// 전략 등록 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 계좌 조회
export async function loadAccountForNewStrategy(accountId: string, token: string): Promise<Account | null> {
  const accounts = await listAccounts(token).catch((): Account[] => [])
  return accounts.find((a) => a.id === accountId) ?? null
}

// 전략 수정 페이지(실제 라우트 + @modal 인터셉트 라우트)가 공유하는 계좌·전략 조회
export async function loadAccountAndStrategyForEdit(
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
  if (!account || !strategy) return null
  return { account, strategy }
}
