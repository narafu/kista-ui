// 기간 프리셋 버튼(7일/30일/전체/직접입력) + 페이지 크기 선택 + 커스텀 날짜 입력 2개를 렌더링하는
// 프레젠테이셔널 컴포넌트. CycleHistoryTable / StrategyOrderHistory의 완전 동일 마크업을 추출 —
// 콜백은 상위에서 주입.
'use client'

import { PageSizeSelector } from '@shared/ui/PageSizeSelector'
import { RANGE_LABELS, type RangePreset } from '@shared/lib/date-range'

interface Props {
  rangeType: RangePreset
  onRangeChange: (r: RangePreset) => void
  pageSize: string
  onPageSizeChange: (s: string) => void
  customFrom: string
  customTo: string
  onCustomFromChange: (v: string) => void
  onCustomToChange: (v: string) => void
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
}: Props) {
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-0.5 rounded-lg bg-muted p-1">
          {(['7d', '30d', 'all', 'custom'] as RangePreset[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRangeChange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-all whitespace-nowrap ${
                rangeType === r ? 'bg-background text-rose-600 shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>
        <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
      </div>
      {rangeType === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="date"
            aria-label="시작 날짜"
            value={customFrom}
            onChange={(e) => onCustomFromChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <span className="text-sm text-muted-foreground">~</span>
          <input
            type="date"
            aria-label="종료 날짜"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => onCustomToChange(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      )}
    </>
  )
}
