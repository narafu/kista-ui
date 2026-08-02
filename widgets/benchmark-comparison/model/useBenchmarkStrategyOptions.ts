'use client'

import { useMemo } from 'react'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useAccountsQuery } from '@entities/account'

// 개별 전략 범위 선택 시 사용할 전략+계좌 조합 옵션과 로딩/오류/빈 상태를 계산한다.
export function useBenchmarkStrategyOptions(enabled: boolean, isStrategyScope: boolean, selectedStrategyId: string) {
  // 개별 전략으로 전환했을 때만 전략 목록을 조회 — 전체 포트폴리오 범위에서는 불필요한 요청을 만들지 않는다
  const strategiesQuery = useAllStrategiesQuery({ enabled: enabled && isStrategyScope })
  const accountsQuery = useAccountsQuery({ enabled: enabled && isStrategyScope })
  const accountsById = useMemo(
    () => new Map(accountsQuery.data?.map((account) => [account.id, account]) ?? []),
    [accountsQuery.data],
  )
  // 계좌 목록까지 로딩 완료되어야 모의계좌 필터링 결과가 확정된다 — 그 전에는 목록을 비워 둔다
  // (그렇지 않으면 계좌 쿼리가 늦게 끝나는 동안 모의계좌 전략이 잠깐 노출·선택될 수 있다)
  const hasStrategyList = strategiesQuery.data != null && accountsQuery.data != null
  // 모의계좌는 벤치마크 비교 대상에서 제외 — 실제 투자 성과만 비교한다
  const strategies = hasStrategyList
    ? strategiesQuery.data.filter((strategy) => accountsById.get(strategy.accountId)?.broker !== 'MOCK')
    : []
  const effectiveStrategyId = selectedStrategyId || strategies[0]?.id
  const strategyListFailed = isStrategyScope
    && !hasStrategyList
    && (strategiesQuery.isError || accountsQuery.isError)
  const strategyListLoading = isStrategyScope
    && !hasStrategyList
    && !strategiesQuery.isError
    && !accountsQuery.isError
  const strategyListEmpty = isStrategyScope
    && hasStrategyList
    && strategies.length === 0

  return {
    strategiesQuery,
    accountsQuery,
    accountsById,
    strategies,
    effectiveStrategyId,
    strategyListFailed,
    strategyListLoading,
    strategyListEmpty,
  }
}
