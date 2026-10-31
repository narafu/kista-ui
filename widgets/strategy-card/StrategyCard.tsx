'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtQuantity, fmtUsd } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { computeOrderReadiness, useStrategyOrderPreviewQuery } from '@entities/order'
import type { OrderReadiness } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'
import { DcaStrategyCard } from './DcaStrategyCard'

interface Props {
  accountId: string
  broker: string // 계좌 broker — DCA 카드가 크립토·통화를 판정한다(티커로는 시장을 정할 수 없다)
  strategy: Strategy
  accountLabel?: string | ReactNode
}

interface OrderSignal {
  color: string
  // 색만으로 전달하지 않도록 같은 판정의 텍스트를 함께 둔다 — 정상(접수됨)은 배지 없이 스크린리더 텍스트만
  tone: 'error' | 'warn' | null
  label: string
}

// 전략 원장 예수금 부족 최우선, 다음은 계좌 예수금·보유 수량 부족(계좌 단위 — 증권사 거절 가능). 미접수는 부족이 확인되지 않아도(unplaced만으로도) 최소 경고 처리해
// "타 방향은 접수됨" 하나만 보고 초록으로 오인시키지 않는다
function getOrderSignal({ buy, sell, ledgerShortfall, accountCashShortfall, accountCashPartial, correctionExcludedBuyUsd, holdingsShortfall }: OrderReadiness, hasTodayOrders: boolean): OrderSignal | null {
  if (ledgerShortfall) {
    const label = `예수금 부족 · 원장 $${fmtUsd(ledgerShortfall.remainingLedger)} / 필요 $${fmtUsd(ledgerShortfall.requiredBuyUsd)}`
    return { color: 'var(--status-error)', tone: 'error', label }
  }
  if (accountCashShortfall) {
    const amounts = `주문가능 $${fmtUsd(accountCashShortfall.availableUsd)} / 접수 필요 $${fmtUsd(accountCashShortfall.requiredBuyUsd)}${correctionExcludedBuyUsd == null ? '' : ` · 보정 주문 제외 $${fmtUsd(correctionExcludedBuyUsd)}`}`
    // 보정 주문을 빼면 충분하면 일부만 거절될 수 있어 경고로 낮춘다 — 전략 간 접수 순서가 정해지지 않아 어느 주문인지는 단정하지 않는다
    if (accountCashPartial) return { color: 'var(--warn)', tone: 'warn', label: `일부 매수 주문 접수 거절 가능 · ${amounts}` }
    return { color: 'var(--status-error)', tone: 'error', label: `계좌 예수금 부족 · ${amounts}` }
  }
  if (holdingsShortfall) {
    const label = `보유 수량 부족 · 판매가능 ${fmtQuantity(holdingsShortfall.availableQuantity)}주 / 필요 ${fmtQuantity(holdingsShortfall.requiredSellQuantity)}주`
    return { color: 'var(--status-error)', tone: 'error', label }
  }
  if (buy.unplaced || sell.unplaced) return { color: 'var(--warn)', tone: 'warn', label: '미접수 주문' }
  if (hasTodayOrders) return { color: 'var(--status-ok)', tone: null, label: '오늘 주문 접수됨' }
  return null
}

function OrderSignalBadge({ signal, className }: { signal: OrderSignal | null; className?: string }) {
  if (!signal?.tone) return null
  return <Badge tone={signal.tone} size="sm" className={className}>{signal.label}</Badge>
}

interface LayoutProps {
  strategy: Strategy
  accountLabel?: string | ReactNode
  usesDivisionCount: boolean
  isVr: boolean
  scheduledStart: boolean
  typeLabel: string
  seedLabel: string
  seedBadgeCls: string
  statusLabel: string | null
  orderSignal: OrderSignal | null
}

function MobileLayout({ strategy, accountLabel, usesDivisionCount, isVr, scheduledStart, typeLabel, seedLabel, seedBadgeCls, statusLabel, orderSignal }: LayoutProps) {
  // 모바일: 2행 레이아웃
  return (
    <div className="flex flex-col gap-1.5 pl-5 pr-4 py-3 lg:hidden">
      {/* 1행: 배지 + 계좌명 */}
      <div data-testid="strategy-card-mobile-top-row" className="flex flex-wrap items-center gap-1.5">
        <Badge tone="brand" size="sm" className="px-2.5">{typeLabel}</Badge>
        {statusLabel && <Badge tone="neutral" size="sm">{statusLabel}</Badge>}
        <OrderSignalBadge signal={orderSignal} />
        {!isVr && <Badge tone="none" size="sm" className={seedBadgeCls}>{seedLabel}</Badge>}
        {strategy.isReverseMode && <Badge tone="warn" size="sm">리버스모드</Badge>}
        {scheduledStart && (
          <Badge tone="none" size="sm" className="bg-info-bg text-info">
            {scheduledStartBadgeLabel(strategy.startDate!)}
          </Badge>
        )}
        {accountLabel && (
          <span className="ml-auto min-w-0 truncate text-xs font-semibold text-muted-foreground">{accountLabel}</span>
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
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-foreground">{strategy.currentRound!.toFixed(1)}회차</span>
        )}
        <ChevronRight className="ml-auto size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
      </div>
    </div>
  )
}

function PcLayout({ strategy, accountLabel, usesDivisionCount, isVr, scheduledStart, typeLabel, seedLabel, seedBadgeCls, statusLabel, orderSignal }: LayoutProps) {
  // PC: 카드 형태
  return (
    <div className="hidden lg:flex flex-col">
      <div className="pl-5 pr-4 pt-4 pb-3">
        {/* 배지 row + 계좌명 우측 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge tone="brand" size="md" className="h-[22px]">{typeLabel}</Badge>
            {statusLabel && <Badge tone="neutral" size="sm" className="h-[22px]">{statusLabel}</Badge>}
            <OrderSignalBadge signal={orderSignal} className="h-[22px]" />
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
              <Badge tone="warn" size="sm" className="h-[22px]">리버스모드</Badge>
            )}
            {scheduledStart && (
              <Badge tone="none" size="sm" className="h-[22px] bg-info-bg text-info">
                {scheduledStartBadgeLabel(strategy.startDate!)}
              </Badge>
            )}
          </div>
          {accountLabel && (
            <span className="ml-3 min-w-0 truncate text-xs font-semibold text-muted-foreground">{accountLabel}</span>
          )}
        </div>
        {/* 티커 + 회차 */}
        <div className="flex items-center justify-between">
          <span className="font-bold text-xl tracking-tight text-foreground leading-none">
            {strategy.ticker}
          </span>
          {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
          {usesDivisionCount && (strategy.currentRound ?? 0) > 0 && (
            <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">{strategy.currentRound!.toFixed(1)}회차</span>
          )}
          <ChevronRight className="ml-2 size-4 text-muted-foreground group-hover:text-[var(--brand-fg-soft)] transition-colors shrink-0" />
        </div>
      </div>
      {/* 시드 정보 행 */}
      {!isVr && (
        <div className="flex items-center justify-between pl-5 pr-4 py-2 border-t border-border">
          <span className="text-sm text-muted-foreground">다음 사이클</span>
          <Badge tone="none" size="sm" className={seedBadgeCls}>{seedLabel}</Badge>
        </div>
      )}
    </div>
  )
}

function CycleStrategyCard({ accountId, strategy, accountLabel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const { data: preview } = useStrategyOrderPreviewQuery(strategy.id)
  const usesDivisionCount = (findStrategyType(strategy.type)?.divisionCounts?.length ?? 0) > 0
  const isVr = strategy.vr != null // VR 전략 여부 — vr 필드 존재 여부로 판정
  const scheduledStart = isScheduledStart(strategy) // startDate가 오늘 이후면 아직 매매 시작 전
  const seedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const statusLabel = strategy.status === 'ACTIVE' ? null : labelOf('strategyStatuses', strategy.status)
  const statusAccent = strategyStatusAccent(strategy.status)
  // "오늘 계획된 주문 중 실제 미접수 방향이 있는가" 기준 — marketSession(장 시간대)이 아니라
  // 이 전략의 실제 주문 시도 결과로 판정한다 (SELL만 성공하고 BUY만 미접수인 상태를 구분하기 위함)
  const readiness = computeOrderReadiness(preview)
  const hasTodayOrders = (preview?.todayOrders ?? []).length > 0
  // 미리보기는 일시중지 중에도 계획·부족 판정을 내려준다 — 실행되지 않을 주문의 경고를 띄우지 않도록 운영중일 때만 표시 (NextOrderCard와 동일)
  const orderSignal = strategy.status === 'ACTIVE' ? getOrderSignal(readiness, hasTodayOrders) : null

  const layoutProps: LayoutProps = { strategy, accountLabel, usesDivisionCount, isVr, scheduledStart, typeLabel: labelOf('strategyTypes', strategy.type), seedLabel, seedBadgeCls, statusLabel, orderSignal }

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] overflow-hidden"
    >
      {/* 상태 액센트 스트립 — 정상(ACTIVE)은 표시하지 않는다 */}
      {statusAccent && (
        <span
          data-testid="strategy-status-strip"
          className="absolute left-0 top-0 bottom-0 w-[3px]"
          style={{ background: statusAccent }}
        />
      )}
      {orderSignal && (
        <span
          data-testid="strategy-order-border-accent"
          className="pointer-events-none absolute inset-0 rounded-[var(--r-lg)] border-t-[3px] border-r-[3px] border-b-[3px] border-l-0"
          style={{ borderColor: orderSignal.color }}
        />
      )}
      {orderSignal && !orderSignal.tone && <span className="sr-only">{orderSignal.label}</span>}

      <MobileLayout {...layoutProps} />

      <PcLayout {...layoutProps} />
    </Link>
  )
}

// DCA는 단건 미리보기를 지원하지 않아(409) 미리보기 훅이 실행되기 전에 래퍼에서 분기한다
export function StrategyCard(props: Props) {
  const { strategy } = props
  if (strategy.type === 'DCA') {
    return <DcaStrategyCard {...props} />
  }
  return <CycleStrategyCard {...props} />
}
