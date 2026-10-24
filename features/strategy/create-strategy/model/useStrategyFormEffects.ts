'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import type { QueryClient } from '@tanstack/react-query'
import { useCreateStrategyMutation, useUpdateStrategyMutation } from '@entities/strategy'
import type { Strategy, StrategyRequest } from '@entities/strategy'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { tradeKeys } from '@entities/trade'
import type { useSeedModel } from './useSeedModel'

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
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    // 오늘 시작인데 오늘 개장 배치(22:00) 이후 등록 — 동작은 그대로, 오늘 밤 장 시작 주문의 수동 접수 경로만 안내
    if (!initial && saved?.todayOpenBatchMissed) {
      toast.info("오늘 개장 배치(22:00)가 지나 오늘 밤 장 시작 주문은 자동으로 나가지 않습니다. 미국장이 열린 뒤 전략 화면의 '바로 주문'으로 접수할 수 있습니다.", { duration: 10000 })
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
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

  return { submit, loading: createMutation.isPending || updateMutation.isPending }
}

// 초기 로딩 완료 후엔 true로 고정 — 타입 전환 시 재스켈레톤 방지
export function useInitializing(loadingBase: boolean, initial: Strategy | undefined, runtimeLoading: boolean) {
  const [initialized, setInitialized] = useState(false)
  if (!loadingBase && !initialized) setInitialized(true)
  return (!initialized && loadingBase) || (!initial && runtimeLoading)
}

// 실제 쿼리 실패만 알린다 — 값이 null인지로 판정하면 현재가 조회가 아직 진행 중인 경우(loadingBase에
// 미포함)까지 실패로 오탐한다.
// 모의계좌는 실제 시세 조회 대상이 아니라 제외한다.
export function useLoadFailToast(isMock: boolean, pricesError: boolean) {
  useEffect(() => {
    if (isMock) return
    if (pricesError) {
      // eslint-disable-next-line react-doctor/no-event-handler
      toast.error('현재가 조회에 실패했습니다', { id: 'strategy-form-load-fail' })
    }
  }, [isMock, pricesError])
}

export function useInitialSeedReset({
  initial,
  minSeed,
  isVr,
  resetSeed,
}: {
  initial?: Strategy
  minSeed: number | null
  isVr: boolean
  resetSeed: ReturnType<typeof useSeedModel>['resetSeed']
}) {
  // 엔드포인트 minSeed 도착/변경 시 시드 입력 재초기화 (신규 등록 한정)
  // canEditSeed(holdings=0 수정)는 기존 시작금액을 유지해야 하므로 여기서 제외한다.
  useEffect(() => {
    if (initial) return
    if (minSeed === null) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({ seedUsdInput: Math.ceil(minSeed) })
  }, [initial, minSeed, resetSeed])

  // VR 신규 등록은 초기 시드를 0으로 시작
  useEffect(() => {
    if (initial) return
    if (!isVr) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({ seedUsdInput: 0 })
  }, [initial, isVr, resetSeed])
}
