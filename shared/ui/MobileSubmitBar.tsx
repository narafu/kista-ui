import type { ReactNode } from 'react'
import { cn } from '@shared/lib/utils'
import { MOBILE_BOTTOM_NAV_OFFSET_CLASS } from '@shared/lib/layout-constants'

interface Props {
  children: ReactNode
  className?: string
}

// 모바일 하단 탭바(widgets/layout/MobileBottomNav, fixed bottom-0 z-40)와 겹치지 않도록 탭바 실제
// 높이만큼 위(MOBILE_BOTTOM_NAV_OFFSET_CLASS)에 별도 z-40 바를 띄운다 — bottom-0으로 겹치면 탭바가
// 위에 렌더돼 버튼이 완전히 가려진다. AssetForm·EditAccountForm·BulkRegisterForm이 동일하게
// 반복하던 wrapper — 버튼 구성(단일/2분할, 스피너 상태 등)은 호출부가 children으로 채운다.
export function MobileSubmitBar({ children, className }: Props) {
  return (
    <div className={cn('sm:hidden fixed left-0 right-0 p-4 bg-background border-t z-40', MOBILE_BOTTOM_NAV_OFFSET_CLASS, className)}>
      {children}
    </div>
  )
}
