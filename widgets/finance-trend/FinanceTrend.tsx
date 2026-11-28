'use client'

import dynamic from 'next/dynamic'
import { asyncFallback } from '@shared/ui/AsyncSection'
import { Surface } from '@shared/ui/Surface'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { cn } from '@shared/lib/utils'
import { MONTHLY_TREND_RANGE_OPTIONS, YEARLY_TREND_RANGE_OPTIONS } from '@entities/finance'
import type { CategoryIndex, FinanceCategory, FinanceCategoryType, Period, TrendRange } from '@entities/finance'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'

const FinanceTrendInner = dynamic(() => import('./FinanceTrendInner'), {
  ssr: false,
  loading: () => asyncFallback({ isLoading: true, skeleton: 'chart', fallbackClassName: 'min-h-[240px] flex-1 sm:min-h-[280px]' }),
})

interface Props {
  type: FinanceCategoryType
  range: TrendRange // 월간 모드: 개월 수, 연간 모드: 년 수
  onRangeChange: (range: TrendRange) => void
  // 카테고리별 선의 순번·색·이름용 — 추이 집계 자체는 서버가 한다.
  categoryTree: FinanceCategory[]
  index: CategoryIndex
  period: Period
  // 부모 쪽 준비 전(카테고리 로딩·기간 미확정) — 로딩으로 그리고 추이 조회도 미룬다.
  isLoading: boolean
  className?: string
}

export function FinanceTrend({ type, range, onRangeChange, categoryTree, index, period, isLoading, className }: Props) {
  return (
    <Surface size="compact" className={cn('flex flex-col gap-4 overflow-hidden text-sm', className)}>
      <div className="flex items-center justify-between gap-1 pb-3">
        <SectionTitle>{period.mode === 'yearly' ? '연도별 추이' : '월별 추이'}</SectionTitle>
        <div>
          <SegmentedToggle
            aria-label="추이 기간"
            options={period.mode === 'yearly' ? YEARLY_TREND_RANGE_OPTIONS : MONTHLY_TREND_RANGE_OPTIONS}
            value={range}
            onChange={onRangeChange}
          />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <FinanceTrendInner
          type={type}
          range={range}
          categoryTree={categoryTree}
          index={index}
          period={period}
          isLoading={isLoading}
        />
      </div>
    </Surface>
  )
}
