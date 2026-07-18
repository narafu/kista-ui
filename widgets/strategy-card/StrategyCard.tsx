'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useMarketSessionQuery } from '@entities/market'
import { useStrategyOrderPreviewQuery } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}


export function StrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview } = useStrategyOrderPreviewQuery(strategy.id)
  const previewOrders = preview?.orders ?? []
  const hasBuyOrders = previewOrders.some((o) => o.direction === 'BUY')
  const { data: marketSession } = useMarketSessionQuery()
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const hasPlannedOrder = (preview?.todayOrders ?? []).some((o) => o.status === 'PLANNED')
  // 서버가 계좌 전체 우선순위 경쟁까지 반영해 계산한 예산 충분 여부 — 라이브 잔고 별도 조회 불필요
  const competition = preview?.competition ?? null
  const hasDeficit = hasBuyOrders && competition ? !competition.sufficientBudget : false
  // 부족 상태가 최우선 — SELL만 PLANNED로 성공해도 BUY가 부족하면 부족색을 표시한다
  const orderBorderColor = hasDeficit
    ? (marketSession?.session === 'DIRECT' ? 'var(--status-error)' : 'var(--warn)')
    : hasPlannedOrder
      ? 'var(--status-ok)'
      : null

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all overflow-hidden"
    >
      {/* 상태 액센트 스트립 */}
      <span
        className="absolute left-0 top-0 bottom-0 w-[3px]"
        style={{ background: strategyStatusAccent(strategy.status) }}
      />
      {orderBorderColor && (
        <span
          data-testid="strategy-order-border-accent"
          className="pointer-events-none absolute inset-0 rounded-[var(--r-lg)] border-t-[3px] border-r-[3px] border-b-[3px] border-l-0"
          style={{ borderColor: orderBorderColor }}
        />
      )}

      {/* 모바일: 2행 레이아웃 */}
      <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
        {/* 1행: 배지 + 계좌번호 */}
        <div data-testid="strategy-card-mobile-top-row" className="flex items-center gap-1.5">
          <Badge tone="brand" size="sm" className="px-2.5">{strategy.type}</Badge>
          {!isVr && <Badge tone="none" size="sm" className={seedBadgeCls}>{seedLabel}</Badge>}
          {accountLabel && (
            <span className="ml-auto text-xs font-semibold text-foreground/60 shrink-0 font-mono tracking-wider">{accountLabel}</span>
          )}
        </div>
        {/* 2행: 티커 + 분할 + 회차 + 금액 */}
        <div data-testid="strategy-card-mobile-main-row" className="flex items-center gap-2">
          <span className="font-bold text-base text-foreground">{strategy.ticker}</span>
          {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
          {usesDivisionCount && (
            <Badge tone="neutral" size="sm" className="text-foreground">
              {strategy.divisionCount}분할
            </Badge>
          )}
          {/* VR 전략 compact V값 배지 */}
          {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
          {isVr && strategy.vr && (
            <Badge tone="neutral" size="sm" className="text-foreground">
              V ${fmtUsd(strategy.vr.value)}
            </Badge>
          )}
          {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
          {usesDivisionCount && (strategy.currentRound ?? 0) > 0 && (
            <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-warn">{strategy.currentRound!.toFixed(1)}회차</span>
          )}
          <span className="ml-auto text-sm font-semibold text-foreground">
            {strategy.initialUsdDeposit != null ? (
              `$${fmtUsd(strategy.initialUsdDeposit)}`
            ) : (
              <span className="text-muted-foreground font-normal">미설정</span>
            )}
          </span>
          <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
        </div>
      </div>

      {/* PC: 카드 형태 */}
      <div className="hidden lg:flex flex-col">
        <div className="pl-5 pr-4 pt-4 pb-3">
          {/* 배지 row + 계좌번호 우측 */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge tone="brand" size="md" className="h-[22px]">{strategy.type}</Badge>
              {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
              {usesDivisionCount && (
                <Badge tone="neutral" size="sm" className="h-[22px] text-foreground">
                  {strategy.divisionCount}분할
                </Badge>
              )}
              {/* VR 전략 compact V값 배지 */}
              {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
              {isVr && strategy.vr && (
                <Badge tone="neutral" size="sm" className="h-[22px] text-foreground">
                  V ${fmtUsd(strategy.vr.value)}
                </Badge>
              )}
              {strategy.isReverseMode && (
                <Badge tone="warn" size="sm" className="h-[22px]">리버스</Badge>
              )}
            </div>
            {accountLabel && (
              <span className="text-xs font-semibold text-foreground/60 shrink-0 ml-3 font-mono tracking-wider">{accountLabel}</span>
            )}
          </div>
          {/* 티커 + 회차 */}
          <div className="flex items-center justify-between">
            <span className="font-bold text-xl tracking-tight text-foreground leading-none">
              {strategy.ticker}
            </span>
            {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
            {usesDivisionCount && (strategy.currentRound ?? 0) > 0 && (
              <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-warn">{strategy.currentRound!.toFixed(1)}회차</span>
            )}
          </div>
        </div>
        {/* 시드 정보 행 */}
        {!isVr && (
          <div className="flex items-center justify-between pl-5 pr-4 py-2 border-t border-border">
            <span className="text-sm text-muted-foreground">다음 사이클</span>
            <Badge tone="none" size="sm" className={seedBadgeCls}>{seedLabel}</Badge>
          </div>
        )}
        {/* 시작금액 푸터 */}
        <div className="flex items-center justify-between pl-5 pr-4 py-2.5 border-t border-border bg-muted/30">
          <span className="text-sm text-muted-foreground">시작금액</span>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-foreground">
              {strategy.initialUsdDeposit != null ? (
                `$${fmtUsd(strategy.initialUsdDeposit)}`
              ) : (
                <span className="text-muted-foreground font-normal">미설정</span>
              )}
            </span>
            <ChevronRight className="size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
          </div>
        </div>
      </div>
    </Link>
  )
}
