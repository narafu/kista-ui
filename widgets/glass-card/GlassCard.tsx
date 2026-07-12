import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  maxWidth?: string
  /** 화면 좌우 상단 오버레이(로고·로그아웃 등) — justify-between 행으로 렌더 */
  topBar?: ReactNode
}

export function GlassCard({ children, className, maxWidth = '440px', topBar }: Props) {
  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 brand-radial-bg">
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
