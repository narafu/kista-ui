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
  const handleMutationSuccess = async () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
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

// 실제 쿼리 실패만 알린다 — 값이 null인지로 판정하면 현재가 조회가 아직 진행 중이거나(loadingBase에
// 미포함) 잔고검증 OFF로 예수금 조회를 건너뛴 경우까지 실패로 오탐한다.
// 모의계좌는 실제 잔고·시세 조회 대상이 아니라 제외한다.
export function useLoadFailToast(isMock: boolean, marginError: boolean, pricesError: boolean) {
  useEffect(() => {
    if (isMock) return
    if (marginError || pricesError) {
      // eslint-disable-next-line react-doctor/no-event-handler
      toast.error('예수금 / 현재가 조회에 실패했습니다', { id: 'strategy-form-load-fail' })
    }
  }, [isMock, marginError, pricesError])
}

export function useInitialSeedReset({
  initial,
  minSeed,
  usdDeposit,
  balanceCheckEnabled,
  isVr,
  resetSeed,
}: {
  initial?: Strategy
  minSeed: number | null
  usdDeposit: number | null
  balanceCheckEnabled: boolean
  isVr: boolean
  resetSeed: ReturnType<typeof useSeedModel>['resetSeed']
}) {
  // 엔드포인트 minSeed 도착/변경 시 시드 게이지 재초기화 (신규 등록 한정)
  // canEditSeed(holdings=0 수정)는 기존 시작금액을 유지해야 하므로 여기서 제외 — 그 경우의 초기화는
  // useSeedModel의 "holdings=0 수정 모드" 전용 effect가 initial.initialUsdDeposit 기준으로 담당한다.
  useEffect(() => {
    if (initial) return
    if (minSeed === null) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({
      pct: usdDeposit !== null && usdDeposit < minSeed ? 0 : 100,
      seedUsdInput: Math.ceil(minSeed),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps -- minSeed 도착/변경 시점에만 재초기화한다. usdDeposit 변경마다 돌면 사용자가 조정한 시드가 덮어써진다
  }, [initial, minSeed])

  // 잔고검증 OFF + VR 신규 등록은 초기 시드를 0으로 시작
  useEffect(() => {
    if (initial) return
    if (balanceCheckEnabled) return
    if (!isVr) return
    // eslint-disable-next-line react-doctor/no-pass-data-to-parent
    resetSeed({ seedUsdInput: 0 })
  }, [balanceCheckEnabled, initial, isVr, resetSeed])
}
