import type { TdHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

/** 데이터 테이블 공용 데이터 셀. TableHeadCell과 기본 정렬(text-center)을 공유한다. 정렬·크기 변형은 className으로 덮어쓴다. */
export function TableDataCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn('px-4 py-3 text-center', className)}
      {...props}
    />
  )
}
