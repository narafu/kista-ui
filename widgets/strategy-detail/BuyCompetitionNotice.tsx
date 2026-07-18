'use client'

import { useState } from 'react'
import { Badge } from '@shared/ui/Badge'
import { fmtUsd } from '@shared/lib/format'
import { toNum } from '@shared/lib/utils'
import type { BuyCompetitionSummary } from '@entities/order'

interface Props {
  competition: BuyCompetitionSummary
  deficitUsd: number
  variant: 'inline' | 'row'
}

// "다음 주문" 카드의 예수금 부족 경고 — 데스크톱(inline)·모바일(row) 두 자리에서 재사용, 펼침 상태는 인스턴스별 독립
export function BuyCompetitionNotice({ competition, deficitUsd, variant }: Props) {
  const [expanded, setExpanded] = useState(false)
  const blocked = competition.blockedByHigherPriority
  const hasBlocked = blocked.length > 0

  const wrapperClass = variant === 'inline'
    ? 'hidden lg:flex flex-col gap-1 mt-1.5'
    : 'lg:hidden px-6 py-2.5 border-b border-border flex flex-col gap-1'
  const textClass = variant === 'inline'
    ? 'flex items-center gap-1.5 flex-wrap text-sm lg:text-base text-warn'
    : 'flex items-center gap-1.5 flex-wrap text-sm text-muted-foreground'
  const badgeClass = variant === 'inline' ? 'lg:h-[24px] lg:text-sm' : ''

  return (
    <div className={wrapperClass}>
      <p className={textClass}>
        <Badge tone="warn" size="sm" className={badgeClass}>예수금 부족</Badge>
        <span>{`$${fmtUsd(deficitUsd)} 부족`}{hasBlocked ? ` (우선순위 전략 ${blocked.length}개가 먼저 배정)` : ''}</span>
        {hasBlocked && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="text-xs underline underline-offset-2 text-muted-foreground hover:text-foreground"
          >
            {expanded ? '자세히 ▴' : '자세히 ▾'}
          </button>
        )}
      </p>
      {expanded && hasBlocked && (
        <ul className="ml-1 space-y-0.5 text-xs text-muted-foreground list-disc list-inside">
          {blocked.map((s) => (
            <li key={s.strategyId}>{`${s.type} (${s.ticker}) — $${fmtUsd(toNum(s.requiredBuyUsd))}`}</li>
          ))}
        </ul>
      )}
      {expanded && competition.uncertainStrategyIds.length > 0 && (
        <p className="text-xs text-muted-foreground">⚠ 일부 전략은 계산 불가로 정확하지 않을 수 있습니다</p>
      )}
    </div>
  )
}
