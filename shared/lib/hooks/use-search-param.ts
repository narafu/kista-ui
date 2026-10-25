'use client'

import { useSearchParams } from 'next/navigation'

// 쿼리 파라미터 하나를 필터 상태로 쓴다. router.replace는 동적 페이지의 서버 프리페치를 다시 돌리므로
// history.replaceState로 바꾼다 — Next.js가 useSearchParams와 동기화한다(BudgetManager와 같은 방식). null이면 파라미터를 지운다.
export function useSearchParam(key: string): [string | null, (value: string | null) => void] {
  const searchParams = useSearchParams()

  function setValue(value: string | null) {
    const next = new URLSearchParams(searchParams.toString())
    if (value === null) next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    window.history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
  }

  return [searchParams.get(key), setValue]
}
