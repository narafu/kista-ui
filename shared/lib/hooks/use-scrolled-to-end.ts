'use client'

import { useEffect, useState, type RefObject } from 'react'

/**
 * 세로 스크롤 요소가 끝까지 내려갔는지(또는 넘치지 않는지) 추적한다. SSR·첫 렌더는 true.
 * 스크롤, 요소·직계 자식 크기 변화(ResizeObserver), 자식·텍스트 변화(MutationObserver)에 재측정한다.
 * 자식 크기를 함께 보는 건 글꼴 로드·줄바꿈처럼 DOM 변경 없이 내용 높이만 바뀌는 경우를 잡기 위해서다.
 */
export function useScrolledToEnd(ref: RefObject<HTMLElement | null>): boolean {
  const [atEnd, setAtEnd] = useState(true)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // 1px 여유 — 서브픽셀 반올림으로 끝에서도 1px 모자란 경우 흡수
    const measure = () => setAtEnd(el.scrollTop + el.clientHeight >= el.scrollHeight - 1)
    measure()
    el.addEventListener('scroll', measure, { passive: true })
    const resize = new ResizeObserver(measure)
    resize.observe(el)
    for (const child of el.children) resize.observe(child)
    const mutation = new MutationObserver(measure)
    mutation.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      el.removeEventListener('scroll', measure)
      resize.disconnect()
      mutation.disconnect()
    }
  }, [ref])

  return atEnd
}
