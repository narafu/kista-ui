import type { ComponentProps } from 'react'
import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/ui/Badge'
import { formatDcaRuleWhen, formatDcaSizing } from '../model/dcaFormat'

interface Props {
  rule: Parameters<typeof formatDcaRuleWhen>[0]
  labelOf: Parameters<typeof formatDcaRuleWhen>[1]
  market: Parameters<typeof formatDcaRuleWhen>[2]
  // entities 간 cross-import 금지라 방향 색(entities/trade directionBadgeClass)은 호출부가 넘긴다
  badgeClassName: string
  size?: ComponentProps<typeof Badge>['size']
}

// 규칙의 방향 배지 + 주기를 왼쪽에, 금액을 오른쪽에 라벨과 함께 둔다 — 폼 목록·상세 공용.
// sm 이상에서는 상세 규칙 카드 그리드(grid-cols-2)의 오른쪽 열 시작과 맞추고, 좁은 화면에서는 오른쪽 끝에 붙인다
export function DcaRuleSummaryLabel({ rule, labelOf, market, badgeClassName, size }: Props) {
  return (
    <span className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-4 sm:grid-cols-2">
      <span className="flex min-w-0 items-baseline gap-2">
        <Badge tone="none" size={size} className={cn('shrink-0', badgeClassName)}>{labelOf('orderDirections', rule.direction)}</Badge>
        {/* 접근성 이름에서 배지·라벨·값이 붙지 않게 하는 공백 */}
        {' '}<span className="shrink-0 text-xs font-normal text-muted-foreground">주기</span>{' '}
        <span>{formatDcaRuleWhen(rule, labelOf, market)}</span>
      </span>
      {' '}
      <span className="flex items-baseline gap-2 sm:justify-start justify-end">
        <span className="shrink-0 text-xs font-normal text-muted-foreground">금액</span>{' '}
        <span>{formatDcaSizing(rule.sizing, market)}</span>
      </span>
    </span>
  )
}
