import Link from 'next/link'
import { cn } from '@shared/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  eyebrow?: string
  eyebrowHref?: string
  title: string
  titleSuffix?: ReactNode
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ eyebrow, eyebrowHref, title, titleSuffix, description, actions, className }: Props) {
  return (
    <div className={cn('mb-8', className)}>
      {/* eyebrow는 액션과 폭을 다투지 않게 독립 줄 — 모바일에서 "← 계좌 별칭"이 접히거나 잘리지 않는다 */}
      {eyebrow && (
        eyebrowHref ? (
          <Link
            href={eyebrowHref}
            className="text-sm font-semibold tracking-[0.12em] text-[var(--brand-fg-soft)] mb-1 hover:text-foreground transition-colors flex w-fit items-center gap-1"
          >
            ← {eyebrow}
          </Link>
        ) : (
          <p className="text-sm font-semibold tracking-[0.12em] text-[var(--brand-fg-soft)] mb-1">
            {eyebrow}
          </p>
        )
      )}
      {/* 모바일에서 제목과 액션이 한 줄에 안 들어가면 액션이 제목 아래로 내려간다 — sm 이상은 기존처럼 한 줄 */}
      <div className="flex flex-wrap sm:flex-nowrap items-end justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="min-w-0 break-words text-2xl font-[800] leading-tight text-foreground">{title}</h1>
            {titleSuffix}
          </div>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap sm:shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
