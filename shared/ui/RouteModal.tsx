'use client'

import { useEffect, useId, useRef } from 'react'
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
  const titleId = useId()

  function dismiss() {
    router.back()
  }

  // ESC 닫기 + Tab 포커스 트랩 — 삭제된 shadcn Dialog(Radix 기반)가 기본 제공하던 모달 접근성을 셸에서 직접 구현
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    container.focus()

    // 대화상자 이름 — 자식 폼의 h1(PageHeader 제목)은 로더를 거쳐 늦게 렌더링되거나 교체될 수 있어 계속 관찰해 다시 연결한다
    function linkTitle() {
      const heading = container?.querySelector('h1')
      if (!container) return
      if (!heading) {
        container.removeAttribute('aria-labelledby')
        return
      }
      heading.id ||= titleId
      container.setAttribute('aria-labelledby', heading.id)
    }
    linkTitle()
    const titleObserver = new MutationObserver(linkTitle)
    titleObserver.observe(container, { childList: true, subtree: true })

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.stopPropagation()
        dismiss()
        return
      }
      if (event.key !== 'Tab' || !container) return
      // 포커스를 받을 수 없는 요소(모바일에서 display:none인 닫기 버튼, tabindex가 붙은 disabled 제출 버튼)를 first/last로 잡으면 트랩이 풀린다
      const focusables = [...container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)]
        .filter((el) => el.getClientRects().length > 0 && !el.matches(':disabled'))
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      // 포털로 뜬 Select·Popover 팝업 안의 Tab은 base-ui가 처리하도록 컨테이너 밖 포커스에는 개입하지 않는다
      const active = document.activeElement
      if (event.shiftKey && (active === first || active === container)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      titleObserver.disconnect()
      previouslyFocused?.focus()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- 마운트 시 1회만 포커스 트랩을 건다. dismiss는 매 렌더 새로 생기지만 router.back()만 호출해 stale 위험이 없고, 재실행되면 포커스가 컨테이너로 다시 튄다
  }, [])

  return (
    // 배경 클릭 닫기는 마우스 보조 수단 — 키보드는 ESC(위 keydown 핸들러)와 닫기 버튼으로 동일하게 닫을 수 있어 배경 자체는 presentation으로 둔다
    <div
      role="presentation"
      className="fixed inset-0 z-50 overflow-y-auto touch-pan-y sm:overflow-y-visible sm:flex sm:items-center sm:justify-center sm:bg-black/40 sm:p-4"
      onClick={(e) => { if (e.target === e.currentTarget) dismiss() }}
    >
      {/* eslint-disable-next-line react-doctor/dialog-has-accessible-name -- aria-labelledby는 마운트 후 자식 h1을 찾아 effect에서 연결한다 */}
      <div
        ref={containerRef}
        // eslint-disable-next-line react-doctor/prefer-html-dialog -- ESC·포커스 트랩·복귀를 위 effect에서 직접 구현했고 <dialog>로 바꾸면 인터셉팅 라우트 레이아웃이 달라짐
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
