import type { ThHTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

export const TABLE_HEAD_TEXT_CLASS = 'text-xs lg:text-sm font-semibold uppercase tracking-widest text-brand-fg-soft'

// 표 열 균등 분배 — 남는 폭이 내용이 긴 한 열로 몰리지 않게 헤더 셀에 같은 퍼센트 폭을 준다.
// 아이콘·체크박스처럼 내용 폭만 쓸 열은 헤더에 `w-px`를 주면 분배에서 빠진다(그 열 수는 n에서 뺀다).
// 내용이 퍼센트 폭보다 넓은 열은 내용 폭을 유지한다(auto 레이아웃 min-content). Tailwind 정적 클래스라 열 수별로 나열한다
const EVEN_COLUMNS_CLASS: Record<number, string> = {
  2: '[&>thead>tr>th:not(.w-px)]:w-[50%]',
  3: '[&>thead>tr>th:not(.w-px)]:w-[33.333%]',
  4: '[&>thead>tr>th:not(.w-px)]:w-[25%]',
  5: '[&>thead>tr>th:not(.w-px)]:w-[20%]',
  6: '[&>thead>tr>th:not(.w-px)]:w-[16.667%]',
  7: '[&>thead>tr>th:not(.w-px)]:w-[14.286%]',
  8: '[&>thead>tr>th:not(.w-px)]:w-[12.5%]',
  9: '[&>thead>tr>th:not(.w-px)]:w-[11.111%]',
  10: '[&>thead>tr>th:not(.w-px)]:w-[10%]',
  11: '[&>thead>tr>th:not(.w-px)]:w-[9.091%]',
  12: '[&>thead>tr>th:not(.w-px)]:w-[8.333%]',
}

/** `<table>`에 붙이는 열 균등 분배 클래스. `columns`는 `w-px`가 아닌 헤더 열 수 */
export function evenColumnsClass(columns: number): string {
  return EVEN_COLUMNS_CLASS[columns] ?? ''
}

/**
 * 데이터 테이블 공용 헤더 셀. 정렬·크기 변형은 className으로 덮어쓴다.
 * 열 이름은 줄바꿈하지 않는다 — 균등 분배 폭이 좁아도 "카테고리 ↑"처럼 정렬 아이콘이 다음 줄로 떨어지지 않게 한다.
 * `numeric`: 숫자 열 표시(값은 다른 열처럼 가운데 정렬 + `tabular-nums`). 스타일 차이는 없고 열 성격 표시용이다.
 */
export function TableHeadCell({ className, numeric: _numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      className={cn(
        'px-4 py-3 text-center whitespace-nowrap',
        TABLE_HEAD_TEXT_CLASS,
        className,
      )}
      {...props}
    />
  )
}
