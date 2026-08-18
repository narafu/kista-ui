'use client'

import { createContext, use, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ACTIVE_GROUP_COOKIE } from '@shared/lib/auth/cookies'

interface ActiveGroupContextValue {
  groupId: string | undefined
  // undefined = 개인 그룹으로 전환(쿠키 클리어). 비민감 UUID 포인터라 Route Handler 왕복 없이
  // document.cookie로 직접 쓴다. router.refresh()로 Server Component 프리페치도 새 그룹으로 재동기화한다.
  setGroupId: (groupId: string | undefined) => void
}

const ActiveGroupContext = createContext<ActiveGroupContextValue | null>(null)

// MetaProvider와 동일 패턴 — 서버가 쿠키에서 읽은 값을 initialGroupId prop으로 전달해
// 클라이언트가 document.cookie를 재파싱하지 않도록 한다(하이드레이션 불일치 방지).
export function ActiveGroupProvider({ children, initialGroupId }: { children: React.ReactNode; initialGroupId?: string }) {
  const [groupId, setGroupIdState] = useState(initialGroupId)
  const router = useRouter()

  const setGroupId = useCallback((next: string | undefined) => {
    if (next) {
      document.cookie = `${ACTIVE_GROUP_COOKIE}=${next}; Path=/; Max-Age=31536000; SameSite=Lax`
    } else {
      document.cookie = `${ACTIVE_GROUP_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`
    }
    setGroupIdState(next)
    router.refresh()
  }, [router])

  return (
    <ActiveGroupContext.Provider value={{ groupId, setGroupId }}>
      {children}
    </ActiveGroupContext.Provider>
  )
}

export function useActiveGroupContext(): ActiveGroupContextValue {
  const ctx = use(ActiveGroupContext)
  if (!ctx) throw new Error('useActiveGroupContext must be used inside ActiveGroupProvider')
  return ctx
}
