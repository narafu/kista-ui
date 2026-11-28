'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { fmtUsd, fmtDecimal } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import { useStrategyOrderPreviewQuery } from '@entities/order'
import type { OrderWarning, OrderWarningCode } from '@entities/order'
import { seedBadgeClass, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { Badge } from '@shared/ui/Badge'
import { DcaStrategyCard } from './DcaStrategyCard'

interface Props {
  accountId: string
  strategy: Strategy
  accountLabel?: string | ReactNode
}

interface OrderSignal {
  color: string
  // 색만으로 전달하지 않도록 같은 판정의 텍스트를 함께 둔다 — 정상(접수됨)은 배지 없이 스크린리더 텍스트만
  tone: 'error' | 'warn' | null
  label: string
}

// 서버 경고 코드별 색 — 위에서부터 우선순위: 전략 원장 부족 최우선, 다음은 계좌 예수금·보유 수량 부족(계좌 단위 — 증권사 거절 가능).
// 보정 주문을 빼면 충분한 부분 부족과 미접수는 경고(주황)로 낮춘다
const ORDER_SIGNAL_RULES: ReadonlyArray<{ code: OrderWarningCode; color: string; tone: 'error' | 'warn' }> = [
  { code: 'LEDGER_SHORTFALL', color: 'var(--status-error)', tone: 'error' },
  { code: 'ACCOUNT_CASH_PARTIAL', color: 'var(--warn)', tone: 'warn' },
  { code: 'ACCOUNT_CASH_SHORTFALL', color: 'var(--status-error)', tone: 'error' },
  { code: 'HOLDINGS_SHORTFALL', color: 'var(--status-error)', tone: 'error' },
  { code: 'BUY_UNPLACED', color: 'var(--warn)', tone: 'warn' },
  { code: 'SELL_UNPLACED', color: 'var(--warn)', tone: 'warn' },
]

// 미접수는 부족이 확인되지 않아도 최소 경고 처리해 "타 방향은 접수됨" 하나만 보고 초록으로 오인시키지 않는다.
// 배지는 한 줄 고정이라 메타 라벨(짧은 상태)만 보여주고 금액이 담긴 서버 문장(detail)은 상세 배너에 둔다
function getOrderSignal(warnings: OrderWarning[], hasTodayOrders: boolean, labelOf: (category: 'orderPreviewWarningCodes', code: string) => string): OrderSignal | null {
  const rule = ORDER_SIGNAL_RULES.find((r) => warnings.some((w) => w.code === r.code))
  if (rule) return { color: rule.color, tone: rule.tone, label: labelOf('orderPreviewWarningCodes', rule.code) }
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
        {usesDivisionCount && (
          <Badge tone="neutral" size="sm" className="text-foreground">
            {strategy.divisionCount}분할
          </Badge>
        )}
        {/* VR 전략 compact V값 배지 */}
        {isVr && strategy.vr && (
          <Badge tone="neutral" size="sm" className="text-foreground">
            V ${fmtUsd(strategy.vr.value)}
          </Badge>
        )}
        {usesDivisionCount && (strategy.currentRound ?? 0) > 0 && (
          <span className="shrink-0 whitespace-nowrap text-xs font-semibold text-foreground">{fmtDecimal(strategy.currentRound!, 1)}회차</span>
        )}
        <ChevronRight className="ml-auto size-4 text-muted-foreground group-hover:text-brand-fg-soft transition-colors shrink-0" />
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
            {usesDivisionCount && (
              <Badge tone="neutral" size="sm" className="h-[22px] text-foreground">
                {strategy.divisionCount}분할
              </Badge>
            )}
            {/* VR 전략 compact V값 배지 */}
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
          {usesDivisionCount && (strategy.currentRound ?? 0) > 0 && (
            <span className="ml-auto shrink-0 whitespace-nowrap text-sm font-semibold text-foreground">{fmtDecimal(strategy.currentRound!, 1)}회차</span>
          )}
          <ChevronRight className="ml-2 size-4 text-muted-foreground group-hover:text-brand-fg-soft transition-colors shrink-0" />
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
  // 부족·미접수 판정은 서버 warnings가 SSOT — marketSession(장 시간대)이 아니라 이 전략의 실제 주문 시도 결과 기준이다
  const hasTodayOrders = (preview?.todayOrders ?? []).length > 0
  // 미리보기는 일시중지 중에도 계획·부족 판정을 내려준다 — 실행되지 않을 주문의 경고를 띄우지 않도록 운영중일 때만 표시 (NextOrderCard와 동일)
  const orderSignal = strategy.status === 'ACTIVE' ? getOrderSignal(preview?.warnings ?? [], hasTodayOrders, labelOf) : null

  const layoutProps: LayoutProps = { strategy, accountLabel, usesDivisionCount, isVr, scheduledStart, typeLabel: labelOf('strategyTypes', strategy.type), seedLabel, seedBadgeCls, statusLabel, orderSignal }

  return (
    <Link
      href={`/accounts/${accountId}/strategies/${strategy.id}`}
      className="group relative block rounded-xl border border-border bg-card shadow-card hover:border-rose-300 hover:shadow-rose transition-[border-color,box-shadow] overflow-hidden"
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
          className="pointer-events-none absolute inset-0 rounded-xl border-t-[3px] border-r-[3px] border-b-[3px] border-l-0"
          style={{ borderColor: orderSignal.color }}
        />
      )}
      {orderSignal && !orderSignal.tone && <span className="sr-only">{orderSignal.label}</span>}

      <MobileLayout {...layoutProps} />

      <PcLayout {...layoutProps} />
    </Link>
  )
}

// DCA 카드는 주문 신호 없이 다음 판정일만 보인다(제품 결정 D10, 서버 미리보기는 DCA도 지원) — 미리보기 훅이 실행되기 전에 래퍼에서 분기한다
export function StrategyCard(props: Props) {
  const { strategy } = props
  if (strategy.type === 'DCA') {
    return <DcaStrategyCard {...props} />
  }
  return <CycleStrategyCard {...props} />
}
