'use client'

import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { cn } from '@shared/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

// 인터셉팅 라우트 전용 셸 — PC(sm 이상)는 배경 위 모달, 모바일은 일반 페이지와 동일한 전체화면으로 렌더링한다.
export function RouteModal({ children, className }: Props) {
  const router = useRouter()

  function dismiss() {
    router.back()
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto sm:overflow-y-visible sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      <div
        className={cn(
          'relative min-h-full w-full bg-background',
          'sm:min-h-0 sm:max-h-[85vh] sm:w-full sm:max-w-lg sm:overflow-y-auto sm:rounded-2xl sm:shadow-[var(--sh-card)] sm:ring-1 sm:ring-foreground/10',
          className,
        )}
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="hidden sm:inline-flex absolute top-3 right-3 items-center justify-center size-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        >
          <X className="size-4" />
        </button>
        <div className="max-w-lg mx-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
