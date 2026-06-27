'use client'

import { useEffect, useRef, useState } from 'react'
import type { Strategy } from '@entities/strategy'

interface UseSeedModelOptions {
  balanceCheckEnabled: boolean
  initial?: Strategy
  usdDeposit: number | null
  minSeed: number | null
}

export interface UseSeedModelReturn {
  pct: number
  setPct: (p: number) => void
  seedUsdInput: number | null
  setSeedUsdInput: (v: number | null) => void
  resetSeed: (opts: { pct?: number; seedUsdInput?: number | null }) => void
  seedUsd: number | null
  isDirty: boolean
  isBelowMinSeed: boolean
  isInvalidSeed: boolean
}

/**
 * 시드 결정 모델 훅
 *
 * - ON 모드: pct(슬라이더) → seedUsd = round(usdDeposit * pct / 100)
 * - OFF 모드: seedUsdInput(USD 직접 입력) → seedUsd = seedUsdInput
 * - isDirty: 사용자가 직접 조작한 경우에만 true (수정 시 미조작이면 시드 미전송)
 * - resetSeed: 타입/종목 변경 등 시스템 초기화 — isDirty 변경 없음
 */
export function useSeedModel({
  balanceCheckEnabled,
  initial,
  usdDeposit,
  minSeed,
}: UseSeedModelOptions): UseSeedModelReturn {
  const [pct, setPctInternal] = useState(100)
  const [isDirty, setDirty] = useState(false)
  const pctInitialized = useRef(false)
  const [seedUsdInput, setSeedUsdInputInternal] = useState<number | null>(
    initial?.initialUsdDeposit ?? null,
  )

  function setPct(p: number) {
    setDirty(true)
    setPctInternal(p)
  }

  function setSeedUsdInput(v: number | null) {
    setDirty(true)
    setSeedUsdInputInternal(v)
  }

  function resetSeed({ pct: newPct, seedUsdInput: newSeedUsd }: { pct?: number; seedUsdInput?: number | null }) {
    if (newPct !== undefined) setPctInternal(newPct)
    if (newSeedUsd !== undefined) setSeedUsdInputInternal(newSeedUsd)
  }

  // 수정 모드: 예수금 로드 후 현재 시드 비율로 게이지 1회 초기화 (ON 모드만)
  useEffect(() => {
    if (!initial || pctInitialized.current) return
    if (usdDeposit === null || usdDeposit <= 0) return
    if (initial.initialUsdDeposit == null) return
    const ratio = Math.round((initial.initialUsdDeposit / usdDeposit) * 100)
    // eslint-disable-next-line react-doctor/no-derived-state
    setPctInternal(Math.min(100, Math.max(0, ratio)))
    pctInitialized.current = true
  }, [initial, usdDeposit])

  // 잔고검증 OFF + 신규 등록 시 minSeed로 자동 동기화 (사용자가 직접 조작하기 전까지)
  useEffect(() => {
    if (balanceCheckEnabled) return
    if (initial) return
    if (isDirty) return
    // eslint-disable-next-line react-doctor/no-derived-state, react-doctor/no-event-handler, react-doctor/no-chain-state-updates
    if (minSeed !== null) setSeedUsdInputInternal(Math.ceil(minSeed))
  }, [balanceCheckEnabled, minSeed, isDirty]) // eslint-disable-line react-doctor/exhaustive-deps

  // 100%일 때는 내림(예수금 초과 방지), 그 외는 올림(시드 부족 방지)
  const seedUsd = !balanceCheckEnabled
    ? seedUsdInput
    : (usdDeposit !== null
        ? (pct === 100 ? Math.floor(usdDeposit) : Math.ceil((usdDeposit * pct) / 100))
        : null)

  const isBelowMinSeed = seedUsd !== null && minSeed !== null && seedUsd < minSeed

  // seedUsd가 0 이하이면 제출 불가 (예수금 0 or OFF 모드 빈칸)
  const isInvalidSeed = !balanceCheckEnabled
    ? (seedUsdInput ?? 0) <= 0
    : seedUsd !== null && seedUsd <= 0

  return {
    pct,
    setPct,
    seedUsdInput,
    setSeedUsdInput,
    resetSeed,
    seedUsd,
    isDirty,
    isBelowMinSeed,
    isInvalidSeed,
  }
}
