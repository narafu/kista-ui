import type { ComponentProps } from 'react'
import { Badge } from '@shared/ui/Badge'
import { formatDcaRuleSummary } from '../model/dcaFormat'

const SUMMARY_SEPARATOR = ' · '

interface Props {
  rule: Parameters<typeof formatDcaRuleSummary>[0]
  labelOf: Parameters<typeof formatDcaRuleSummary>[1]
  market: Parameters<typeof formatDcaRuleSummary>[2]
  // entities 간 cross-import 금지라 방향 색(entities/trade directionBadgeClass)은 호출부가 넘긴다
  badgeClassName: string
  size?: ComponentProps<typeof Badge>['size']
}

// 규칙 요약의 첫 토막(방향)을 배지로, 나머지를 이어 쓴다 — 목록·상세·실행 이력 공용
export function DcaRuleSummaryLabel({ rule, labelOf, market, badgeClassName, size }: Props) {
  const [direction, ...rest] = formatDcaRuleSummary(rule, labelOf, market).split(SUMMARY_SEPARATOR)
  return (
    <>
      <Badge tone="none" size={size} className={badgeClassName}>{direction}</Badge>
      {/* 접근성 이름에서 배지와 요약이 붙지 않게 하는 공백 */}
      {' '}{rest.join(SUMMARY_SEPARATOR)}
    </>
  )
}
