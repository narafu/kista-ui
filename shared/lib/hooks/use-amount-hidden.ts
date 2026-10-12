'use client'

import { useSyncExternalStore } from 'react'
import { maskAmount } from '@shared/lib/format'

const STORAGE_KEY = 'kista-amount-hidden'

interface AmountHiddenState {
  // null = 아직 localStorage를 읽지 않음(SSR·hydration 첫 렌더) — 이때도 가린 상태로 렌더해 실제 금액이 깜빡이지 않게 한다
  hidden: boolean | null
  // 가계부 헤더의 "금액 보기" — 저장하지 않는 세션 한정 일시 공개
  revealed: boolean
}

const SERVER_STATE: AmountHiddenState = { hidden: null, revealed: false }

// 가계부 금액 마스킹 상태 — 설정 탭 토글(영구, localStorage)과 헤더 보기 버튼(일시)이 같은 화면의
// 여러 위젯과 상태를 공유해야 해서 모듈 스토어 + useSyncExternalStore로 둔다.
let state: AmountHiddenState | null = null
const listeners = new Set<() => void>()

function getState(): AmountHiddenState {
  if (state) return state
  let hidden = false
  try {
    hidden = window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    // localStorage 접근 불가(프라이빗 모드 등) — 기본값(표시)으로 동작
  }
  state = { hidden, revealed: false }
  return state
}

function setState(next: AmountHiddenState) {
  state = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function setAmountHidden(next: boolean) {
  setState({ hidden: next, revealed: false })
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
  } catch {
    // 이번 세션에서만 토글 유지
  }
}

function setAmountRevealed(next: boolean) {
  setState({ ...getState(), revealed: next })
}

export function useAmountHiddenPreference() {
  const { hidden, revealed } = useSyncExternalStore(subscribe, getState, () => SERVER_STATE)
  const masked = hidden !== false && !revealed

  return {
    hidden,
    revealed,
    masked,
    setAmountHidden,
    setAmountRevealed,
    /** 금액 표시 문자열을 현재 마스킹 상태에 맞춰 반환 */
    maskIfHidden: (display: string) => (masked ? maskAmount(display) : display),
  }
}
