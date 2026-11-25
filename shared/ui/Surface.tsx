import type { HTMLAttributes } from 'react'
import { cn } from '@shared/lib/utils'

const PADDING = {
  /** 설정·폼 섹션 */
  default: 'p-4 sm:p-6',
  /** 목록·차트·요약 카드 */
  compact: 'p-4',
  /** 표·차트를 가장자리까지 붙인다 — 안쪽 여백은 자식이 정한다 */
  flush: '',
} as const

type Props = HTMLAttributes<HTMLElement> & { as?: 'div' | 'section'; size?: keyof typeof PADDING }

/** 섹션 카드는 이것 하나다 — 모서리·배경·테두리·그림자와 여백(default·compact·flush). 레이아웃은 className으로 지정한다. */
export function Surface({ as: Tag = 'div', size = 'default', className, ...props }: Props) {
  return <Tag className={cn('rounded-xl bg-card border border-border shadow-card', PADDING[size], className)} {...props} />
}
