'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { useCreateStrategyMutation, useUpdateStrategyMutation } from '@entities/strategy'
import type { Strategy, StrategyRequest } from '@entities/strategy'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { invalidateLedgerTotals } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { apiFieldMsg } from '@shared/lib/api-client'

export function useStrategyMutations({
  queryClient,
  accountId,
  initial,
  onSuccess,
}: {
  queryClient: QueryClient
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
}) {
  const handleMutationSuccess = async (saved?: Strategy) => {
    toast.success(initial ? '전략을 수정했습니다' : '전략을 등록했습니다')
    // 오늘 시작인데 오늘 개장 배치(22:00) 이후 등록 — 동작은 그대로, 오늘 밤 장 시작 주문이 나가지 않음만 안내
    if (!initial && saved?.todayOpenBatchMissed) {
      toast.info('오늘 개장 배치(22:00)가 지나 오늘 밤 장 시작 주문은 나가지 않습니다. 장 시작 주문은 다음 거래일부터 자동으로 나갑니다.', { duration: 10000 })
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
      // 전략 합산 예수금·평가금이 바로 반영되도록 함께 무효화한다
      invalidateLedgerTotals(queryClient, accountId),
    ])
    onSuccess?.()
  }
  const createMutation = useCreateStrategyMutation(accountId, handleMutationSuccess)
  const updateMutation = useUpdateStrategyMutation(initial?.id ?? '', handleMutationSuccess)

  function submit(payload: StrategyRequest) {
    if (initial) {
      updateMutation.mutate(payload)
    } else {
      createMutation.mutate(payload)
    }
  }

  // 검증 POST가 실패·대기인 채 제출해 서버가 필드 거절(400 fieldErrors)하면 토스트는 요약만 띄우므로 필드 문장을 폼 하단에 보인다.
  // 표시 전용 — 제출 차단에는 넣지 않는다(고친 뒤에도 막히지 않게). 다음 제출(mutate)이 지우고, useStrategyForm은 지금 입력의 검증 결과가 오면 숨긴다
  const submitError = apiFieldMsg((initial ? updateMutation : createMutation).error)
  return { submit, loading: createMutation.isPending || updateMutation.isPending, submitError }
}

// 초기 로딩 완료 후엔 true로 고정 — 타입 전환 시 재스켈레톤 방지
export function useInitializing(loadingBase: boolean) {
  const [initialized, setInitialized] = useState(false)
  if (!loadingBase && !initialized) setInitialized(true)
  return !initialized && loadingBase
}

// 실제 쿼리 실패만 알린다 — 값이 null인지로 판정하면 현재가 조회가 아직 진행 중인 경우(loadingBase에
// 미포함)까지 실패로 오탐한다.
// 모의계좌는 실제 시세 조회 대상이 아니라 제외한다.
export function useLoadFailToast(isMock: boolean, pricesError: boolean) {
  useEffect(() => {
    if (isMock) return
    if (pricesError) {
      toast.error('현재가 조회에 실패했습니다', { id: 'strategy-form-load-fail' })
    }
  }, [isMock, pricesError])
}
