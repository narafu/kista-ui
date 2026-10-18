'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtDate, fmtMoney } from '@shared/lib/format'
import { isCryptoMarket } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { useMeta } from '@entities/meta'
import { dcaExecutionStatusLabel, formatCryptoNextExecution, formatDcaSchedule, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { directionBadgeClass } from '@entities/trade'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}

// DCA 카드 — 미리보기(readiness·시드) 없이 설정 요약·다음 판정일·최근 결과만 표시
export function DcaStrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { labelOf, findTicker } = useMeta()
  const isCrypto = isCryptoMarket(findTicker(strategy.ticker)?.market)
  const { dca } = strategy // 서버가 dca를 누락해도 카드 셸은 렌더한다
  const summary = dca && `${formatDcaSchedule(dca, labelOf('dcaFrequencies', dca.frequency))} · ${fmtMoney(dca.amount, isCrypto ? 'KRW' : 'USD')} · ${labelOf('orderTypes', dca.orderType)}`
  const last = dca?.lastExecution
  const lastLabel = last
    ? `${dcaExecutionStatusLabel(last.status)}${last.skipReason ? ` · ${labelOf('dcaSkipReasons', last.skipReason)}` : ''}`
    : null
  const scheduledStart = isScheduledStart(strategy)
  const statusLabel = strategy.status === 'ACTIVE' ? null : labelOf('strategyStatuses', strategy.status)
  const statusAccent = strategyStatusAccent(strategy.status)

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] overflow-hidden"
    >
      {statusAccent && (
        <span data-testid="strategy-status-strip" className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: statusAccent }} />
      )}
      <div className="flex items-center gap-3 pl-5 pr-4 py-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand" size="sm">DCA</Badge>
            {statusLabel && <Badge tone="neutral" size="sm">{statusLabel}</Badge>}
            {dca && <Badge tone="none" size="sm" className={directionBadgeClass(dca.direction)}>{labelOf('orderDirections', dca.direction)}</Badge>}
            {scheduledStart && (
              <Badge tone="none" size="sm" className="bg-info-bg text-info">{scheduledStartBadgeLabel(strategy.startDate!)}</Badge>
            )}
            <span className="text-sm font-bold text-foreground">{strategy.ticker}</span>
            {accountLabel && <span className="min-w-0 truncate text-xs font-semibold text-muted-foreground">{accountLabel}</span>}
          </div>
          {dca && (
            <>
              <p className="text-sm">{summary}</p>
              <p className="text-xs text-muted-foreground">
                {isCrypto
                  ? `다음 실행 ${formatCryptoNextExecution(dca.nextExecution?.kstTradeDate, dca.executionHour)}`
                  : `다음 판정일 ${dca.nextExecution ? fmtDate(dca.nextExecution.kstTradeDate) : '미정'}`}
                {lastLabel && ` · 최근 ${lastLabel}`}
              </p>
            </>
          )}
        </div>
        <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
      </div>
    </Link>
  )
}
