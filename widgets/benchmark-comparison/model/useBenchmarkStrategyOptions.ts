'use client'

import { useMemo } from 'react'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useAccountsQuery } from '@entities/account'

// 전략+계좌 조합 옵션을 계산한다. 두 자산 탭 모두 전략 드롭다운이 항상 노출되므로
// enabled(패널 전체 활성 여부)로만 게이팅한다 — 탭별 조건부 로딩 없음
export function useBenchmarkStrategyOptions(enabled: boolean) {
  const strategiesQuery = useAllStrategiesQuery({ enabled })
  const accountsQuery = useAccountsQuery({ enabled })
  const accountsById = useMemo(
    () => new Map(accountsQuery.data?.map((account) => [account.id, account]) ?? []),
    [accountsQuery.data],
  )
  // 계좌 목록까지 로딩 완료되어야 모의계좌 필터링 결과가 확정된다 — 그 전에는 목록을 비워 둔다
  // (그렇지 않으면 계좌 쿼리가 늦게 끝나는 동안 모의계좌 전략이 잠깐 노출·선택될 수 있다)
  const hasStrategyList = strategiesQuery.data != null && accountsQuery.data != null
  // 모의계좌는 벤치마크 비교 대상에서 제외 — 실제 투자 성과만 비교한다.
  // useMemo로 참조를 고정 — 그렇지 않으면 소비 측 useEffect(예: dangling 전략 id 복구)가 매 렌더 재실행된다
  const strategies = useMemo(
    () => (hasStrategyList
      ? strategiesQuery.data.filter((strategy) => accountsById.get(strategy.accountId)?.broker !== 'MOCK')
      : []),
    [hasStrategyList, strategiesQuery.data, accountsById],
  )

  return {
    strategiesQuery,
    accountsQuery,
    accountsById,
    strategies,
    hasStrategyList,
  }
}
