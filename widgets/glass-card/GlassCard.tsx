import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  maxWidth?: string
  /** 화면 좌우 상단 오버레이(로고·로그아웃 등) — justify-between 행으로 렌더 */
  topBar?: ReactNode
  /** 배경에 은은한 시세 그리드 텍스처 오버레이 (로그인 등 첫 진입 화면용) */
  texture?: boolean
}

export function GlassCard({ children, className, maxWidth = '440px', topBar, texture }: Props) {
  return (
    <div className={cn('relative min-h-screen flex items-center justify-center p-4 brand-radial-bg', texture && 'brand-radial-texture')}>
      {topBar && (
        <div className="absolute top-7 inset-x-7 sm:inset-x-9 flex items-center justify-between z-10">
          {topBar}
        </div>
      )}
      <div className={cn('glass-card w-full p-8 sm:p-10', className)} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
}
