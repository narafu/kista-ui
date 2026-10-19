'use client'

import { cn } from '@shared/lib/utils'
import { SEGMENT_ACTIVE_CLASS, SEGMENT_INACTIVE_CLASS, SEGMENT_LIST_CLASS } from './segmentedStyles'

interface Props<T> {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
  'aria-label': string
  // 컨테이너 레이아웃 오버라이드(예: 'grid w-full grid-cols-3'로 균등 분할)
  className?: string
  itemClassName?: string
  // sm: 카드 헤더용 테두리 없는 소형(24px) — 대시보드 차트 기간 토글
  size?: 'md' | 'sm'
}

// aria-pressed 버튼 그룹 형태의 세그먼트 토글(모드·기간·필터 선택 등).
// 내용 패널을 바꾸는 탭은 SegmentedTabs, 라우트 이동은 SectionTabBar를 쓴다.
export function SegmentedToggle<T extends string | number>({ options, value, onChange, 'aria-label': ariaLabel, className, itemClassName, size = 'md' }: Props<T>) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('inline-flex rounded-md', size === 'md' ? SEGMENT_LIST_CLASS : 'gap-1', className)}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'flex shrink-0 items-center justify-center rounded text-xs font-medium transition-colors',
            size === 'md' ? 'min-h-9 px-2' : 'min-h-6 px-1.5',
            value === option.value ? SEGMENT_ACTIVE_CLASS : SEGMENT_INACTIVE_CLASS,
            itemClassName,
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
