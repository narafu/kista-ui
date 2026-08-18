'use client'

import { Card, CardContent } from '@/components/ui/card'
import { KpiCard } from '@widgets/kpi-card'
import { seedBadgeClass, strategyStatusAccent, isScheduledStart, scheduledStartBadgeLabel, nextVrRolloverDate } from '@entities/strategy'
import { useMeta } from '@entities/meta'
import { cn, toNum } from '@shared/lib/utils'
import { fmtDate, fmtUsd } from '@shared/lib/format'
import { Badge } from '@shared/ui/Badge'
import type { Strategy } from '@entities/strategy'
import type { NextOrderPreview } from '@entities/order'
import { SKIP_REASON_LABELS, previewErrorMsg, recurringModeLabel } from './orderBannerCopy'

interface Props {
  strategy: Strategy
  preview: NextOrderPreview | undefined
  isLoadingPreview: boolean
  isPreviewError: boolean
  previewError: unknown
}

export function StrategyMetaSection({ strategy, preview, isLoadingPreview, isPreviewError, previewError }: Props) {
  const { labelOf, findStrategyType } = useMeta()
  const cycleSeedLabel = labelOf('cycleSeedTypes', strategy.cycleSeedType)
  const strategyTypeMeta = findStrategyType(strategy.type)
  const usesDivisionCount = (strategyTypeMeta?.divisionCounts?.length ?? 0) > 0
  const seedBadgeCls = seedBadgeClass(strategy.cycleSeedType)
  const scheduledStart = isScheduledStart(strategy) // startDate가 오늘 이후면 아직 매매 시작 전
  const position = preview?.position ?? null

  return (
    <>
      {/* 전략 정보 헤더 스트립 — 카드 중첩 대신 얇은 라벨 행 + 균일 타일 그리드 (감사 A-20) */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-fg-soft)]">
          <span
            data-testid="strategy-status-accent"
            className="size-2 rounded-full shrink-0"
            style={{ background: strategyStatusAccent(strategy.status) }}
          />
          전략 정보
        </p>
        <div data-testid="strategy-status-group" className="flex flex-wrap items-center justify-end gap-2">
          {scheduledStart && (
            <Badge tone="none" size="md" className="bg-info-bg text-info">
              {scheduledStartBadgeLabel(strategy.startDate!)}
            </Badge>
          )}
          {strategy.isReverseMode && (
            <Badge tone="warn" size="md">리버스모드</Badge>
          )}
          {strategy.status !== 'ACTIVE' && (
            <Badge tone="warn" size="lg" className="border border-warn/20">
              {strategy.status}
            </Badge>
          )}
        </div>
      </div>
      <div data-testid="strategy-meta-grid" className="grid grid-cols-2 gap-3">
        <KpiCard
          label="전략타입"
          value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{strategy.type}</span>}
          className="p-4 lg:p-5"
          valueClassName="text-xl lg:text-2xl"
        />
        {strategy.vr ? (
          <KpiCard
            label="운용 방식"
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{recurringModeLabel(strategy.vr.recurringAmount)}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
        ) : (
          <KpiCard
            label="다음 사이클"
            value={
              <Badge tone="none" size="md" className={cn('h-[28px] lg:h-[36px] text-sm lg:text-base', seedBadgeCls)}>{cycleSeedLabel}</Badge>
            }
            className="p-4 lg:p-5"
          />
        )}
      </div>

      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {!strategy.vr && (
        <div data-testid="strategy-summary-grid" className="grid grid-cols-2 gap-3">
          <KpiCard
            label={usesDivisionCount ? '분할' : '운용 방식'}
            value={<span className="inline-flex items-center text-xl lg:text-2xl font-bold">{usesDivisionCount ? `${strategy.divisionCount}분할` : '매매표'}</span>}
            className="p-4 lg:p-5"
            valueClassName="text-xl lg:text-2xl"
          />
          <KpiCard
            label="시작금액"
            value={
              strategy.initialUsdDeposit != null ? (
                <span className="inline-flex items-center text-xl lg:text-3xl font-bold">{`$${fmtUsd(strategy.initialUsdDeposit)}`}</span>
              ) : (
                <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
              )
            }
          />
        </div>
      )}

      {/* VR 전용 KPI 그리드 — strategy.vr 존재 시에만 렌더 */}
      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {strategy.vr && (
        <div data-testid="strategy-vr-grid" className="space-y-3">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="밴드 폭" value={`${strategy.vr.bandWidth}%`} />
            <KpiCard label="주기" value={`${strategy.vr.intervalWeeks}주`} />
            <KpiCard label="시작일" value={strategy.startDate ? fmtDate(strategy.startDate) : '미설정'} />
            <KpiCard
              label="다음 사이클 시작"
              value={strategy.startDate ? fmtDate(nextVrRolloverDate(strategy.startDate, strategy.vr.intervalWeeks)) : '미설정'}
            />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiCard label="G" value={`${strategy.vr.gradient}`} />
            <KpiCard label="V" value={`$${fmtUsd(strategy.vr.value)}`} />
            <KpiCard
              label="pool"
              value={
                strategy.initialUsdDeposit != null ? (
                  `$${fmtUsd(strategy.initialUsdDeposit)}`
                ) : (
                  <span className="inline-flex items-center text-sm lg:text-base text-muted-foreground font-normal">미설정</span>
                )
              }
            />
            <KpiCard
              label="pool 상한"
              value={`$${fmtUsd(strategy.vr.poolLimit)}`}
              sub={`${(strategy.vr.poolLimitRate * 100).toFixed(0)}%`}
            />
          </div>
        </div>
      )}

      {/* eslint-disable-next-line react-doctor/rendering-conditional-render */}
      {usesDivisionCount && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoadingPreview ? (
            <>
              <KpiCard label="회차(T)" skeleton />
              <KpiCard label="단위금액(회)" skeleton />
              <KpiCard label="기준가" skeleton />
              <KpiCard label="목표가" skeleton />
            </>
          ) : isPreviewError ? (
            <Card className="col-span-2 lg:col-span-4">
              <CardContent className="p-5 text-sm text-muted-foreground text-center">{previewErrorMsg(previewError)}</CardContent>
            </Card>
          ) : position ? (
            <>
              <KpiCard label="회차(T)" value={`${position.currentRound.toFixed(1)}회차`} />
              <KpiCard label="단위금액(회)" value={`$${fmtUsd(toNum(position.unitAmount))}`} />
              <KpiCard label="기준가" value={`$${fmtUsd(toNum(position.referencePrice))}`} />
              <KpiCard label="목표가" value={`$${fmtUsd(toNum(position.targetPrice))}`} />
            </>
          ) : (
            <Card className="col-span-2 lg:col-span-4">
              <CardContent className="p-5 text-sm text-muted-foreground text-center">
                {preview?.skipReason ? SKIP_REASON_LABELS[preview.skipReason] : '다음 주문 정보를 불러올 수 없습니다.'}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  )
}
