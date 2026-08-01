'use client'

import { useEffect, useRef, useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'

const THRESHOLD = 70
const MAX_PULL = 110

export function PullToRefresh() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, startTransition] = useTransition()
  const startYRef = useRef(0)
  const isPullingRef = useRef(false)

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const target = e.target as Element | null
    // 드로어/다이얼로그 등 오버레이 내부 터치는 PTR 대상에서 제외
    if (target?.closest('[data-slot="drawer-content"], [data-slot="dialog-content"]')) return
    if (window.scrollY > 0) return
    startYRef.current = e.touches[0].clientY
    isPullingRef.current = true
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPullingRef.current) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta <= 0) {
      isPullingRef.current = false
      setPullDistance(0)
      return
    }
    const clamped = Math.min(delta * 0.5, MAX_PULL)
    setPullDistance(clamped)
    e.preventDefault()
  }, [])

  const handleTouchEndRef = useRef<() => void>(() => {})
  const handleTouchEnd = useCallback(() => {
    if (!isPullingRef.current) return
    isPullingRef.current = false
    setPullDistance((dist) => {
      if (dist >= THRESHOLD) {
        // 서버 렌더 갱신 + 클라이언트 전용 쿼리까지 전체 재동기화, 완료 시점까지 스피너 유지
        startTransition(async () => {
          router.refresh()
          await queryClient.invalidateQueries()
        })
      }
      return 0
    })
  }, [router, queryClient])
  handleTouchEndRef.current = handleTouchEnd

  // eslint-disable-next-line react-doctor/advanced-event-handler-refs
  useEffect(() => {
    const stableEnd = () => handleTouchEndRef.current()
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    // eslint-disable-next-line react-doctor/client-passive-event-listeners
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', stableEnd, { passive: true })
    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', stableEnd)
    }
  }, [handleTouchStart, handleTouchMove])

  const progress = Math.min(pullDistance / THRESHOLD, 1)
  const triggered = pullDistance >= THRESHOLD
  const visible = pullDistance > 4 || isRefreshing

  return (
    <div
      className="fixed top-0 inset-x-0 z-40 flex justify-center pointer-events-none lg:hidden"
      style={{ paddingTop: isRefreshing ? 14 : Math.max(pullDistance - 20, 0) }}
    >
      {visible && (
        <div
          className={cn(
            'size-9 rounded-full bg-card border shadow-md flex items-center justify-center transition-colors',
            triggered ? 'border-[var(--brand-fg-soft)] text-[var(--brand-fg-soft)]' : 'border-border text-muted-foreground',
          )}
        >
          {isRefreshing ? (
            <Spinner size={16} />
          ) : (
            <RefreshCw
              className="size-4"
              style={{ transform: `rotate(${progress * 270}deg)` }}
            />
          )}
        </div>
      )}
    </div>
  )
}
