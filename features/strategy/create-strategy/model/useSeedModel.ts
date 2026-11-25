'use client'

import { useCallback, useState } from 'react'
import type { Strategy } from '@entities/strategy'

interface UseSeedModelOptions {
  initial?: Strategy
  // 중간부터 시작(보유 평단가·수량) — 이미 보유한 평가금액이 있으면 예수금 0도 허용
  avgPrice?: number | null
  quantity?: number | null
}

interface UseSeedModelReturn {
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  resetSeed: (opts: { seedUsdInput?: number | null }) => void
  seedUsd: number | null
  isInvalidSeed: boolean
}

/**
 * 시드 결정 모델 훅
 *
 * - seedUsdInput(USD 직접 입력) → seedUsd = seedUsdInput
 * - resetSeed: 타입/종목 변경 등 시스템 초기화
 */
export function useSeedModel({
  initial,
  avgPrice = null,
  quantity = null,
}: UseSeedModelOptions): UseSeedModelReturn {
  const [seedUsdInput, setSeedUsdInputInternal] = useState<number | null>(
    initial?.initialDeposit ?? null,
  )

  function setSeedUsdInput(v: number | null) {
    setSeedUsdInputInternal(v)
  }

  // 호출부 effect deps에 넣을 수 있도록 참조를 고정한다 — state setter만 쓰므로 deps가 비어도 안전하다
  const resetSeed = useCallback(({ seedUsdInput: newSeedUsd }: { seedUsdInput?: number | null }) => {
    if (newSeedUsd !== undefined) setSeedUsdInputInternal(newSeedUsd)
  }, [])

  const seedUsd = seedUsdInput

  const existingHoldingsValue = (avgPrice ?? 0) * (quantity ?? 0)

  // 보유 평가금액만으로 충분하면 예수금 0도 허용
  // (VR 거치식이 초기 V값만으로 시드 0을 허용하는 것과 동일한 규칙 — 둘 다 완전히 비어있을 때만 차단)
  const isInvalidSeed = existingHoldingsValue <= 0 && (seedUsdInput ?? 0) <= 0

  return {
    seedUsdInput,
    setSeedUsdInput,
    resetSeed,
    seedUsd,
    isInvalidSeed,
  }
}

// 최소 시드 판정 = 예수금 직접 입력 + 이미 보유 중인 평가금액(평단가 × 수량). 최소 시드는 서버 검증 응답이라 시드 상태와 따로 계산한다
export function isBelowMinSeed(input: { seedUsd: number | null; minSeed: number | null; avgPrice: number | null; quantity: number | null }): boolean {
  const { seedUsd, minSeed, avgPrice, quantity } = input
  return seedUsd !== null && minSeed !== null && seedUsd + (avgPrice ?? 0) * (quantity ?? 0) < minSeed
}
