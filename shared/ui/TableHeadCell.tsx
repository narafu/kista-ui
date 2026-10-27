import type { ThHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

export const TABLE_HEAD_TEXT_CLASS = 'text-xs lg:text-sm font-semibold uppercase tracking-widest text-[var(--brand-fg-soft)]'

/**
 * 데이터 테이블 공용 헤더 셀. 정렬·크기 변형은 className으로 덮어쓴다.
 * `numeric`: 숫자 열 — 열 폭을 내용에 맞게 좁혀 가운데 헤더와 오른쪽 정렬 값(`text-right tabular-nums`)이 벌어져 보이지 않게 한다.
 */
export function TableHeadCell({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-center',
        TABLE_HEAD_TEXT_CLASS,
        numeric && 'w-px whitespace-nowrap',
        className,
      )}
      {...props}
    />
  )
}
