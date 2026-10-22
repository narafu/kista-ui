'use client'

import { useCallback, useEffect, useEffectEvent, useRef } from 'react'

// 같은 URL 안의 하위 뷰(규칙 편집 화면 등)를 브라우저 이력 한 칸으로 표현한다 — 모바일 뒤로가기가 하위 뷰만 닫게.
// URL 없는 pushState는 Next(16.2) 패치가 __NA·트리를 복사하고 라우터 액션을 dispatch하지 않아, 이 칸에서의
// 뒤로가기는 같은 URL 트래버스(no-op)가 된다.
// ponytail: 하위 뷰에서 새로고침하면 표식만 남은 칸이 생겨 뒤로가기 한 번이 no-op이 된다. 불편 보고가 오면 마운트에서 replaceState로 표식 제거
export const SUBVIEW_HISTORY_KEY = '__kistaSubview'

export function pushSubviewEntry(): void {
  window.history.pushState({ ...window.history.state, [SUBVIEW_HISTORY_KEY]: true }, '')
}

export function isSubviewEntry(state: unknown = window.history.state): boolean {
  return typeof state === 'object' && state !== null && (state as Record<string, unknown>)[SUBVIEW_HISTORY_KEY] === true
}

// open이 false→true가 될 때 한 칸 쌓고, 그 칸을 벗어나는 popstate에서 onPop을 부른다.
// leave()가 하위 뷰를 닫는 유일한 경로다 — 실제 닫기는 onPop이 한다(브라우저 뒤로가기와 같은 경로)
export function useSubviewHistory(open: boolean, onPop: () => void): { leave: () => void } {
  const wasOpen = useRef(false)
  const handlePop = useEffectEvent(onPop)

  useEffect(() => {
    // StrictMode 이펙트 재실행에도 한 칸만 쌓도록 직전 open을 기억한다
    if (open && !wasOpen.current) pushSubviewEntry()
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!open) return
    const listener = (event: PopStateEvent) => {
      if (!isSubviewEntry(event.state)) handlePop()
    }
    window.addEventListener('popstate', listener)
    return () => window.removeEventListener('popstate', listener)
  }, [open])

  return { leave: useCallback(() => window.history.back(), []) }
}
