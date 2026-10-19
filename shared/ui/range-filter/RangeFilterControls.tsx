// 기간 프리셋 버튼(7일/30일/전체/입력) + 페이지 크기 선택 + 커스텀 날짜 입력 2개를 렌더링하는
// 프레젠테이셔널 컴포넌트. CycleHistoryTable / StrategyOrderHistory의 완전 동일 마크업을 추출 —
// 콜백은 상위에서 주입.
'use client'

import { Input } from '@/components/ui/input'
import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { DEFAULT_RANGE_PRESETS, RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'

const PRESET_OPTIONS = DEFAULT_RANGE_PRESETS.map((r) => ({ value: r, label: RANGE_LABELS[r] }))

interface Props {
  rangeType: RangePreset
  onRangeChange: (r: RangePreset) => void
  pageSize: string
  onPageSizeChange: (s: string) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
  /** lg 이상에서 기간 프리셋 버튼 옆(건수 앞)에 표시할 추가 필터 (예: 방향/유형/상태 Select) */
  extraFilters?: React.ReactNode
}

export function RangeFilterControls({
  rangeType,
  onRangeChange,
  pageSize,
  onPageSizeChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  extraFilters,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedToggle aria-label="기간" options={PRESET_OPTIONS} value={rangeType} onChange={onRangeChange} />
          {extraFilters && <div className="hidden lg:block">{extraFilters}</div>}
        </div>
        <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
      </div>
      {rangeType === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="date"
            aria-label="시작 날짜"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="w-auto"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <Input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="w-auto"
          />
        </div>
      )}
    </>
  )
}
