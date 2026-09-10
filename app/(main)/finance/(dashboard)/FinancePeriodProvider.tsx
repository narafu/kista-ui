'use client'

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { Period, PeriodMode } from '@entities/finance'

interface FinancePeriodValue {
  // 사용자가 명시적으로 고른 월. null이면 각 탭이 "데이터 있는 최근 월"을 자체 판정한다.
  userMonth: string | null
  mode: PeriodMode
  // 수입/소비/저축 탭 — Period(월+모드) 통째 설정
  setPeriod: (period: Period) => void
  // 자산 탭 — 월만 설정(연간 모드 개념 없음)
  setMonth: (month: string) => void
}

const FinancePeriodContext = createContext<FinancePeriodValue | null>(null)

// 가계부 대시보드에서 사용자가 고른 조회 월(자산·수입·소비·저축 탭 공유)과 모드(수입/소비/저축
// 전용)를 (dashboard)/layout.tsx 레벨에서 들고 있어 탭(자식 라우트) 전환 후에도 유지되게 한다 —
// 레이아웃은 형제 라우트 이동 시 remount되지 않으므로. 하드 새로고침엔 프로바이더가 새로
// 마운트돼 초기화된다(=선택 리셋). 예전엔 이 상태를 URL 쿼리(?month=&mode=)에 실었으나, 자동
// 선택월까지 URL에 박혀 재평가가 영구 봉인되는 버그가 있었고 새로고침에도 선택이 남는 게
// 의도와 달라 로컬 상태로 옮겼다.
export function FinancePeriodProvider({ children }: { children: ReactNode }) {
  const [userMonth, setUserMonth] = useState<string | null>(null)
  const [mode, setMode] = useState<PeriodMode>('monthly')

  const value = useMemo<FinancePeriodValue>(
    () => ({
      userMonth,
      mode,
      setPeriod: (period) => {
        setUserMonth(period.month)
        setMode(period.mode)
      },
      setMonth: (month) => setUserMonth(month),
    }),
    [userMonth, mode],
  )

  return <FinancePeriodContext.Provider value={value}>{children}</FinancePeriodContext.Provider>
}

export function useFinancePeriod(): FinancePeriodValue {
  const value = useContext(FinancePeriodContext)
  if (!value) throw new Error('useFinancePeriod must be used within FinancePeriodProvider')
  return value
}
