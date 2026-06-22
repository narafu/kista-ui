'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'
import { cn } from '@shared/lib/utils'

const THRESHOLD = 70
const MAX_PULL = 110

export function PullToRefresh() {
  const router = useRouter()
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
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
        setRefreshing(true)
        router.refresh()
        setTimeout(() => setRefreshing(false), 1200)
      }
      return 0
    })
  }, [router])
  handleTouchEndRef.current = handleTouchEnd

  useEffect(() => {
    const stableEnd = () => handleTouchEndRef.current()
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
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
  const visible = pullDistance > 4 || refreshing

  return (
    <div
      className="fixed top-0 inset-x-0 z-40 flex justify-center pointer-events-none lg:hidden"
      style={{ paddingTop: refreshing ? 14 : Math.max(pullDistance - 20, 0) }}
    >
      {visible && (
        <div
          className={cn(
            'size-9 rounded-full bg-card border shadow-md flex items-center justify-center transition-colors',
            triggered ? 'border-[var(--brand-fg-soft)] text-[var(--brand-fg-soft)]' : 'border-border text-muted-foreground',
          )}
        >
          <RefreshCw
            className={cn('size-4', refreshing && 'animate-spin')}
            style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          />
        </div>
      )}
    </div>
  )
}
