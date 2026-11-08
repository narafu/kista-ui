'use client'

import { ArrowDown, ArrowUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SortDirection } from '@shared/lib/hooks/use-table-sort'

interface Props<K extends string> {
  options: { key: K; label: string }[]
  activeKey: K
  direction: SortDirection
  /** `useTableSort`의 handleSort — 같은 키면 방향 토글, 다른 키면 desc로 시작 */
  onSort: (key: K) => void
}

/** lg 미만 카드 목록용 정렬 컨트롤 — 데스크탑 `SortableHeadCell`과 같은 `useTableSort` 상태를 공유한다. */
export function MobileSortControl<K extends string>({ options, activeKey, direction, onSort }: Props<K>) {
  const items = options.map((o) => ({ value: o.key, label: o.label }))
  const active = options.find((o) => o.key === activeKey)
  return (
    <div className="flex items-center justify-end gap-2 px-4 py-2 lg:hidden">
      <Select items={items} value={active ? activeKey : null} onValueChange={(v) => v && v !== activeKey && onSort(v as K)}>
        <SelectTrigger aria-label="정렬 기준" className="h-8 w-36 text-sm">
          <SelectValue placeholder="정렬" />
        </SelectTrigger>
        <SelectContent>
          {items.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        onClick={() => onSort(activeKey)}
        disabled={!active} // 정렬 기준을 고르기 전(기본 순서)에는 방향이 의미 없다
        aria-label={direction === 'asc' ? '오름차순 (눌러서 내림차순으로 변경)' : '내림차순 (눌러서 오름차순으로 변경)'}
        className="inline-flex size-8 items-center justify-center rounded-md border text-muted-foreground disabled:opacity-50"
      >
        {direction === 'asc' ? <ArrowUp className="size-4" /> : <ArrowDown className="size-4" />}
      </button>
    </div>
  )
}
