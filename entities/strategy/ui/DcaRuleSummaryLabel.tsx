import type { ComponentProps } from 'react'
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

// 규칙의 방향을 배지로, 나머지 요약을 이어 쓴다 — 폼 목록·상세 공용
export function DcaRuleSummaryLabel({ rule, labelOf, market, badgeClassName, size }: Props) {
  return (
    <>
      <Badge tone="none" size={size} className={badgeClassName}>{labelOf('orderDirections', rule.direction)}</Badge>
      {/* 접근성 이름에서 배지와 요약이 붙지 않게 하는 공백 */}
      <span>{' '}{formatDcaRuleWhen(rule, labelOf, market)} · <strong className="font-bold">{formatDcaSizing(rule.sizing, market)}</strong></span>
    </>
  )
}
