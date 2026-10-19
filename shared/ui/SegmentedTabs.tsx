'use client'

import type { ReactNode } from 'react'
import { Tabs } from '@base-ui/react/tabs'
import { cn } from '@shared/lib/utils'
import { SEGMENT_ACTIVE_CLASS, SEGMENT_INACTIVE_CLASS, SEGMENT_LIST_CLASS } from './segmentedStyles'

interface Props<T> {
  options: { value: T; label: string; content: ReactNode }[]
  defaultValue: T
  'aria-label': string
  className?: string
  listClassName?: string
  itemClassName?: string
}

// 같은 화면 안에서 내용 패널을 바꾸는 탭(tablist/tab/tabpanel) — SegmentedToggle과 같은 세그먼트 시각.
// 값 선택(기간·모드·필터)은 SegmentedToggle, 라우트 이동은 SectionTabBar를 쓴다.
// 비활성 패널은 언마운트된다(keepMounted 기본 false).
export function SegmentedTabs<T extends string>({ options, defaultValue, 'aria-label': ariaLabel, className, listClassName, itemClassName }: Props<T>) {
  return (
    <Tabs.Root defaultValue={defaultValue} className={className}>
      {/* 패널이 이미 로드된 내용이라 화살표 이동만으로 바로 전환한다(WAI-ARIA APG 자동 활성화) */}
      <Tabs.List activateOnFocus aria-label={ariaLabel} className={cn('inline-flex', SEGMENT_LIST_CLASS, listClassName)}>
        {options.map((option) => (
          <Tabs.Tab
            key={option.value}
            value={option.value}
            className={(state) => cn(
              'flex min-h-9 shrink-0 items-center justify-center rounded px-2 text-xs font-medium transition-colors',
              state.active ? SEGMENT_ACTIVE_CLASS : SEGMENT_INACTIVE_CLASS,
              itemClassName,
            )}
          >
            {option.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>
      {options.map((option) => (
        // Base UI가 활성 패널에 tabIndex=0을 주므로 포커스 링이 보여야 한다
        <Tabs.Panel key={option.value} value={option.value} className="rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          {option.content}
        </Tabs.Panel>
      ))}
    </Tabs.Root>
  )
}
