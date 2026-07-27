'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { IconButton } from './IconButton'

interface Props {
  children: React.ReactNode
  className?: string
}

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// 인터셉팅 라우트 전용 셸 — PC(sm 이상)는 배경 위 모달, 모바일은 일반 페이지와 동일한 전체화면으로 렌더링한다.
export function RouteModal({ children, className }: Props) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)

  function dismiss() {
    router.back()
  }

  // ESC 닫기 + Tab 포커스 트랩 — 삭제된 shadcn Dialog(Radix 기반)가 기본 제공하던 모달 접근성을 셸에서 직접 구현
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    container.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab' || !container) return
      const focusables = container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, []) // eslint-disable-line react-doctor/exhaustive-deps

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto sm:overflow-y-visible sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        data-slot="dialog-content"
        tabIndex={-1}
        className={cn(
          'relative min-h-full w-full bg-background outline-none',
          'sm:min-h-0 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:overflow-y-auto sm:rounded-2xl sm:shadow-[var(--sh-card)] sm:ring-1 sm:ring-foreground/10',
          className,
        )}
      >
        <IconButton
          onClick={dismiss}
          aria-label="닫기"
          className="hidden sm:inline-flex absolute top-3 right-3"
        >
          <X className="size-4" />
        </IconButton>
        <div className="max-w-lg mx-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
