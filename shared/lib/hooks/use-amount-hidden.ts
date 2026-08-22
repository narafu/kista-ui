'use client'

import { useEffect, useState } from 'react'

const STORAGE_KEY = 'kista-amount-hidden'

// 가계부 각 탭 요약 금액 마스킹 여부 — 설정 탭 토글 하나로 켜고, 수입/소비/저축 탭 요약이 소비한다.
// 두 위치는 항상 다른 탭에서만 렌더되므로(FinanceDashboard가 탭 하나만 조건부 마운트) 전역 Provider
// 없이 localStorage를 SSOT로 각자 마운트 시점에 읽는 것만으로 충분하다.
export function useAmountHiddenPreference() {
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    try {
      setHidden(window.localStorage.getItem(STORAGE_KEY) === '1')
    } catch {
      // localStorage 접근 불가(프라이빗 모드 등) — 기본값(표시)으로 동작
    }
  }, [])

  function setAmountHidden(next: boolean) {
    setHidden(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
    } catch {
      // 이번 세션에서만 토글 유지
    }
  }

  return { hidden, setAmountHidden }
}
