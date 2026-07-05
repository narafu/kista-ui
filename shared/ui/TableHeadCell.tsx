import type { ThHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

/** 데이터 테이블 공용 헤더 셀. 정렬·크기 변형은 className으로 덮어쓴다. */
export function TableHeadCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-center text-sm lg:text-base font-semibold uppercase tracking-widest text-[var(--brand-fg-soft)]',
        className,
      )}
      {...props}
    />
  )
}
