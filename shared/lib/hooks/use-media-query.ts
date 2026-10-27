'use client'

import { useCallback, useSyncExternalStore } from 'react'

/** CSS media query 일치 여부. 서버 스냅샷은 false — 클라이언트 첫 렌더 직후 실제 값으로 맞춰진다 */
export function useMediaQuery(query: string): boolean {
  // 구독 함수가 렌더마다 바뀌면 useSyncExternalStore가 매번 재구독한다 — query 단위로 고정
  const subscribe = useCallback((onChange: () => void) => {
    const mq = window.matchMedia(query)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
