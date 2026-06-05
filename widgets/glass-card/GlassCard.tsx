import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  className?: string
  maxWidth?: string
}

export function GlassCard({ children, className, maxWidth = '440px' }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--background)' }}>
      <div className={cn('glass-card w-full p-8 sm:p-10', className)} style={{ maxWidth }}>
        {children}
      </div>
    </div>
  )
}
