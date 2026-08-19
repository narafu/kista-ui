'use client'

import { useState } from 'react'

// 확인 다이얼로그(삭제·탈퇴 등)가 반복하던 "target state + open 파생 + onOpenChange에서
// target 리셋" 보일러플레이트 추출. target이 곧 open 여부를 겸한다 — payload가 필요 없는
// 다이얼로그(그룹 탈퇴 등)는 useConfirmDialog<true>()로 쓰고 request(true)를 호출한다.
export function useConfirmDialog<T>() {
  const [target, setTarget] = useState<T | null>(null)

  return {
    target,
    open: target !== null,
    request: (value: T) => setTarget(value),
    close: () => setTarget(null),
    onOpenChange: (next: boolean) => { if (!next) setTarget(null) },
  }
}
