'use client'

import { Card, CardAction, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { seedBadgeClass, isScheduledStart, scheduledStartBadgeLabel, nextVrRolloverDate } from '@entities/strategy'
import { useMeta } from '@entities/meta'
import { cn, toNum } from '@shared/lib/utils'
import { fmtDate, fmtUsd } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { recurringModeLabel } from './orderBannerCopy'

// DcaStrategyDetail의 TILE과 같은 값 크기 — 모바일 2열 값 칸(약 100~115px)에 금액이 넘치지 않게 한 그리드 안에서 통일
const TILE_VALUE = 'text-lg sm:text-xl lg:text-2xl tabular-nums break-keep'

interface Props {
  strategy: Strategy
  preview: NextOrderPreview | undefined
  isLoadingPreview: boolean
  isPreviewError: boolean
}

// 계좌 상세의 "계좌 요약"과 같은 틀 — 제목 있는 카드 안에 타일 그리드를 둔다. 상태 배지는 제목 오른쪽(CardAction)
export function StrategyInfoCard({ strategy, children }: { strategy: Strategy; children: React.ReactNode }) {
  const { labelOf } = useMeta()
  const scheduledStart = isScheduledStart(strategy) // startDate가 오늘 이후면 아직 매매 시작 전
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle role="heading" aria-level={2} className="text-base lg:text-lg">전략 정보</CardTitle>
        <CardAction data-testid="strategy-status-group" className="flex flex-wrap items-center justify-end gap-2">
          {scheduledStart && (
            <Badge tone="none" size="md" className="bg-info-bg text-info">
              {scheduledStartBadgeLabel(strategy.startDate!)}
            </Badge>
          )}
          {strategy.isReverseMode && (
            <Badge tone="warn" size="md">리버스모드</Badge>
          )}
          {strategy.status !== 'ACTIVE' && (
            <Badge tone="neutral" size="lg">
              {labelOf('strategyStatuses', strategy.status)}
            </Badge>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 px-6 pb-6">{children}</CardContent>
    </Card>
  )
}

interface TopGridProps {
  strategy: Strategy
  cycleSeedLabel: string
}

/** "적립식($200.00)" — 금액 중간에서 끊기지 않게 "(" 앞에서만 줄바꿈 */
function RecurringModeValue({ label }: { label: string }) {
  const i = label.indexOf('(')
  if (i < 0) return <span className="font-bold">{label}</span>
  return (
    <span className="font-bold">
      {label.slice(0, i)}
      <wbr />
      <span className="whitespace-nowrap">{label.slice(i)}</span>
    </span>
  )
}

function TopGrid({ strategy, cycleSeedLabel }: TopGridProps) {
  const { labelOf } = useMeta()
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  return (
    <div data-testid="strategy-meta-grid" className="grid grid-cols-2 gap-3">
      <KpiCard
        label="전략타입"
        value={<span className="inline-flex items-center font-bold">{labelOf('strategyTypes', strategy.type)}</span>}
        className="p-4 lg:p-5"
        valueClassName={TILE_VALUE}
      />
      {strategy.vr ? (
        <KpiCard
          label="운용 방식"
          value={<RecurringModeValue label={recurringModeLabel(strategy.vr.recurringAmount)} />}
          className="p-4 lg:p-5"
          valueClassName={TILE_VALUE}
        />
      ) : (
        <KpiCard
          label="다음 사이클"
          value={
            <Badge tone="none" size="md" className={cn('h-[28px] lg:h-[36px] text-base', seedBadgeCls)}>{cycleSeedLabel}</Badge>
          }
          className="p-4 lg:p-5"
          valueClassName={TILE_VALUE}
        />
      )}
    </div>
  )
}

function SummaryGrid({ strategy, usesDivisionCount }: { strategy: Strategy; usesDivisionCount: boolean }) {
  return (
    <div data-testid="strategy-summary-grid" className="grid grid-cols-2 gap-3">
      <KpiCard
        label={usesDivisionCount ? '분할' : '운용 방식'}
        value={<span className="inline-flex items-center font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : '매매표'}</span>}
        className="p-4 lg:p-5"
        valueClassName={TILE_VALUE}
      />
      <KpiCard
        label="시작 예수금"
        value={
          strategy.initialDeposit != null ? (
            <span className="inline-flex items-center font-bold">{`$${fmtUsd(strategy.initialDeposit)}`}</span>
          ) : (
            <span className="inline-flex items-center text-muted-foreground font-normal">미설정</span>
          )
        }
        valueClassName={TILE_VALUE}
      />
    </div>
  )
}

function VrGrid({ vr, startDate }: { vr: NonNullable<Strategy['vr']>; startDate: Strategy['startDate'] }) {
  return (
    <div data-testid="strategy-vr-grid" className="space-y-3">
      {/* 날짜(최대 약 182px, text-3xl)가 lg 4열·xl 반쪽 카드에 한 줄로 들어가지 않아 이 그리드만 lg에서도 2열로 둔다 */}
      <div className="grid grid-cols-2 gap-3">
        <KpiCard label="밴드 폭" value={`${vr.bandWidth}%`} valueClassName={TILE_VALUE} />
        <KpiCard label="주기" value={`${vr.intervalWeeks}주`} valueClassName={TILE_VALUE} />
        {/* 날짜는 모바일·xl(사이드 열) 반쪽 카드에 한 줄로 들어가지 않아 그 구간에서만 전체 폭으로 둔다 */}
        <KpiCard label="시작일" value={startDate ? fmtDate(startDate) : '미설정'} className="col-span-2 sm:col-span-1 xl:col-span-2" valueClassName={TILE_VALUE} />
        <KpiCard
          className="col-span-2 sm:col-span-1 xl:col-span-2"
          label="다음 사이클 시작"
          value={startDate ? fmtDate(nextVrRolloverDate(startDate, vr.intervalWeeks)) : '미설정'}
          valueClassName={TILE_VALUE}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-3">
        <KpiCard label="G" value={`${vr.gradient}`} valueClassName={TILE_VALUE} />
        <KpiCard label="V" value={`$${fmtUsd(vr.value)}`} valueClassName={TILE_VALUE} />
        <KpiCard
          label="pool"
          value={
            vr.currentPool != null ? (
              `$${fmtUsd(vr.currentPool)}`
            ) : (
              <span className="inline-flex items-center text-muted-foreground font-normal">미설정</span>
            )
          }
          valueClassName={TILE_VALUE}
        />
        <KpiCard
          label="pool 상한"
          value={`$${fmtUsd(vr.poolLimit)}`}
          sub={`${(vr.poolLimitRate * 100).toFixed(0)}%`}
          valueClassName={TILE_VALUE}
        />
      </div>
    </div>
  )
}

interface PositionGridProps {
  preview: NextOrderPreview | undefined
  isLoadingPreview: boolean
  isPreviewError: boolean
}

// 미리보기 오류·주문 없음 사유(skipReason)는 다음 주문 카드가 안내한다 — 그 외에 값이 없으면 타일을 '-'로 남긴다
function PositionGrid({ preview, isLoadingPreview, isPreviewError }: PositionGridProps) {
  const position = preview?.position ?? null
  if (!isLoadingPreview && (isPreviewError || preview?.skipReason)) return null
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-2 gap-3">
      {position ? (
        <>
          <KpiCard label="회차(T)" value={`${position.currentRound.toFixed(1)}회차`} valueClassName={TILE_VALUE} />
          <KpiCard label="단위금액(회)" value={`$${fmtUsd(toNum(position.unitAmount))}`} valueClassName={TILE_VALUE} />
          <KpiCard label="기준가" value={`$${fmtUsd(toNum(position.referencePrice))}`} valueClassName={TILE_VALUE} />
          <KpiCard label="목표가" value={`$${fmtUsd(toNum(position.targetPrice))}`} valueClassName={TILE_VALUE} />
        </>
      ) : isLoadingPreview ? (
        <>
          <KpiCard label="회차(T)" skeleton valueClassName={TILE_VALUE} />
          <KpiCard label="단위금액(회)" skeleton valueClassName={TILE_VALUE} />
          <KpiCard label="기준가" skeleton valueClassName={TILE_VALUE} />
          <KpiCard label="목표가" skeleton valueClassName={TILE_VALUE} />
        </>
      ) : (
        <>
          <KpiCard label="회차(T)" value="-" valueClassName={TILE_VALUE} />
          <KpiCard label="단위금액(회)" value="-" valueClassName={TILE_VALUE} />
          <KpiCard label="기준가" value="-" valueClassName={TILE_VALUE} />
          <KpiCard label="목표가" value="-" valueClassName={TILE_VALUE} />
        </>
      )}
    </div>
  )
}

export function StrategyMetaSection({ strategy, preview, isLoadingPreview, isPreviewError }: Props) {
  const { labelOf, findStrategyType } = useMeta()
  const cycleSeedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const strategyTypeMeta = findStrategyType(strategy.type)
  const usesDivisionCount = (strategyTypeMeta?.divisionCounts?.length ?? 0) > 0

  return (
    <StrategyInfoCard strategy={strategy}>
      <TopGrid strategy={strategy} cycleSeedLabel={cycleSeedLabel} />

      {!strategy.vr && <SummaryGrid strategy={strategy} usesDivisionCount={usesDivisionCount} />}

      {/* VR 전용 KPI 그리드 — strategy.vr 존재 시에만 렌더 */}
      {strategy.vr && <VrGrid vr={strategy.vr} startDate={strategy.startDate} />}

      {usesDivisionCount ? (
        <PositionGrid preview={preview} isLoadingPreview={isLoadingPreview} isPreviewError={isPreviewError} />
      ) : null}
    </StrategyInfoCard>
  )
}
