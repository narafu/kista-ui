'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtDate } from '@shared/lib/format'
import { isCryptoBroker } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { earliestNextExecution, formatCryptoNextExecution, latestLastExecution, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  broker: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}

// DCA 카드 — 미리보기(readiness·시드) 없이 설정 요약·다음 판정일·최근 결과만 표시.
// 레이아웃은 사이클 카드(StrategyCard)와 같은 골격: 모바일 2행, PC는 배지·티커 헤더 + 정보 행 + 금액 푸터
export function DcaStrategyCard({ accountId, broker, strategy, accountLabel }: Props) {
  const { labelOf } = useMeta()
  // 크립토 여부는 계좌 broker 기준 — BTC는 업비트·바이낸스 모두에 있어 티커로 정할 수 없다
  const isCrypto = isCryptoBroker(broker)
  const { dca } = strategy // 서버가 dca를 누락해도 카드 셸은 렌더한다
  const rules = dca?.rules ?? []
  const buyCount = rules.filter(r => r.direction === 'BUY').length
  const sellCount = rules.length - buyCount
  const summary = dca && [
    ...(buyCount ? [`${labelOf('orderDirections', 'BUY')} ${buyCount}`] : []),
    ...(sellCount ? [`${labelOf('orderDirections', 'SELL')} ${sellCount}`] : []),
  ].join(' · ')
  const last = latestLastExecution(rules)
  const lastLabel = last
    ? `최근 ${labelOf('dcaExecutionStatuses', last.status)}${last.skipReason ? ` · ${labelOf('dcaSkipReasons', last.skipReason)}` : ''}`
    : null
  const next = earliestNextExecution(rules)
  const nextLabel = isCrypto ? '다음 실행' : '다음 판정일'
  const nextValue = !next?.nextExecution
    ? '미정'
    : isCrypto
      ? formatCryptoNextExecution(next.nextExecution.kstTradeDate, next.executionHour)
      : fmtDate(next.nextExecution.kstTradeDate)
  const scheduledStart = isScheduledStart(strategy)
  const statusLabel = strategy.status === 'ACTIVE' ? null : labelOf('strategyStatuses', strategy.status)
  const statusAccent = strategyStatusAccent(strategy.status)

  const badges = (badgeCls?: string) => (
    <>
      <Badge tone="brand" size="sm" className={badgeCls}>DCA</Badge>
      {statusLabel && <Badge tone="neutral" size="sm" className={badgeCls}>{statusLabel}</Badge>}
      {lastLabel && <Badge tone="neutral" size="sm" className={badgeCls}>{lastLabel}</Badge>}
      {scheduledStart && (
        <Badge tone="none" size="sm" className={cn('bg-info-bg text-info', badgeCls)}>{scheduledStartBadgeLabel(strategy.startDate!)}</Badge>
      )}
    </>
  )
  const chevron = <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] overflow-hidden"
    >
      {statusAccent && (
        <span data-testid="strategy-status-strip" className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: statusAccent }} />
      )}

      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
        <div className="flex flex-wrap items-center gap-1.5">
          {badges()}
          {/* PC는 정보 행에 따로 두지만 모바일은 2행 골격이라 배지 행에 둔다 */}
          {dca && <Badge tone="neutral" size="sm">{nextLabel} {nextValue}</Badge>}
          {accountLabel && <span className="ml-auto min-w-0 truncate text-xs font-semibold text-muted-foreground">{accountLabel}</span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 font-bold text-base text-foreground">{strategy.ticker}</span>
          {summary && <span className="ml-auto min-w-0 truncate text-sm font-semibold text-foreground">{summary}</span>}
          {chevron}
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        <div className="pl-5 pr-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-1.5">{badges('h-[22px]')}</div>
            {accountLabel && <span className="ml-3 min-w-0 truncate text-xs font-semibold text-muted-foreground">{accountLabel}</span>}
          </div>
          <div className="flex items-center justify-between">
            <span className="font-bold text-xl tracking-tight text-foreground leading-none">{strategy.ticker}</span>
            {summary && <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">{summary}</span>}
            {!dca && chevron}
          </div>
        </div>
        {dca && (
          <>
            <div className="flex items-center justify-between pl-5 pr-4 py-2.5 border-t border-border bg-muted/30">
              <span className="text-sm text-muted-foreground">{nextLabel}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground">{nextValue}</span>
                {chevron}
              </div>
            </div>
          </>
        )}
      </div>
    </Link>
  )
}
