'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { computeOrderReadiness, useStrategyOrderPreviewQuery } from '@entities/order'
import type { OrderReadiness } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { Badge } from '@shared/ui/Badge'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
  initialPreview?: NextOrderPreview
}

// 부족 최우선. 미접수인데 라이브 잔고/판매가능수량 확인 자체가 실패했으면(liveBalanceUncertain/
// sellQuantityUncertain) 충족으로 오인시키지 않도록 부족과 동일하게 취급한다. 오늘 시도 전(preview)에도
// BUY/SELL 계획이 있는데 조회가 실패한 상태는 "정상"과 구분되게 표시해야 하므로 unplaced 여부와 무관하게
// 경고로 취급한다. SELL 미접수는 판매가능수량 부족이 확인되지 않아도(sellUnplaced만으로도) 최소 경고 처리해
// "타 방향은 접수됨" 하나만 보고 초록으로 오인시키지 않는다
function getOrderBorderColor(readiness: OrderReadiness, hasTodayOrders: boolean): string | null {
  const rules: Array<[boolean, string]> = [
    [
      readiness.hasDeficit || readiness.hasSellQuantityDeficit
        || (readiness.buyUnplaced && readiness.liveBalanceUncertain)
        || (readiness.sellUnplaced && readiness.sellQuantityUncertain),
      'var(--status-error)',
    ],
    [
      readiness.buyUnplaced || readiness.sellUnplaced
        || (readiness.hasBuyOrders && readiness.liveBalanceUncertain)
        || (readiness.hasSellOrders && readiness.sellQuantityUncertain),
      'var(--warn)',
    ],
    [hasTodayOrders, 'var(--status-ok)'],
  ]
  return rules.find(([condition]) => condition)?.[1] ?? null
}

export function StrategyCard({ accountId, strategy, accountLabel, initialPreview }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview } = useStrategyOrderPreviewQuery(strategy.id, initialPreview)
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  // "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준 — marketSession(장 시간대)이 아니라
  // 이 전략의 실제 주문 시도 결과로 판정한다 (SELL만 성공하고 BUY만 미접수인 상태를 구분하기 위함)
  const readiness = computeOrderReadiness(preview)
  const hasTodayOrders = (preview?.todayOrders ?? []).length > 0
  const orderBorderColor = getOrderBorderColor(readiness, hasTodayOrders)

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
