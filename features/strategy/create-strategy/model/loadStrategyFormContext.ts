import { listAccounts } from '@entities/account'
import { findStrategy } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

// 전략 등록 페이지에서 쓰는 계좌 조회
export async function loadAccountForNewStrategy(accountId: string, token: string): Promise<Account | null> {
  const accounts = await listAccounts(token)
  return accounts.find((a) => a.id === accountId) ?? null
}

// 전략 수정 페이지에서 쓰는 계좌·전략 조회 — 폼이 account.broker를 쓴다
export async function loadAccountAndStrategyForEdit(
  accountId: string,
  strategyId: string,
  token: string,
): Promise<{ account: Account; strategy: Strategy } | null> {
  const [account, strategy] = await Promise.all([
    loadAccountForNewStrategy(accountId, token),
    findStrategy(accountId, strategyId, token),
  ])
  return account && strategy ? { account, strategy } : null
}
