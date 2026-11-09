import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/ui/Badge'
import { formatDcaRuleWhen, formatDcaSizing } from '../model/dcaFormat'

interface Props {
  rule: Parameters<typeof formatDcaRuleWhen>[0]
  labelOf: Parameters<typeof formatDcaRuleWhen>[1]
  market: Parameters<typeof formatDcaRuleWhen>[2]
  // entities 간 cross-import 금지라 방향 색(entities/trade directionBadgeClass)은 호출부가 넘긴다
  badgeClassName: string
}

// 규칙의 방향 배지 + 주기를 왼쪽에, 금액을 오른쪽에 라벨과 함께 둔다 — 전략 폼 규칙 목록 전용(상세 규칙 카드는 항목별 라벨 행으로 따로 그린다).
// 금액은 sm 이상에서는 컨테이너 절반 위치에서 시작하고, 좁은 화면에서는 오른쪽 끝에 붙인다
export function DcaRuleSummaryLabel({ rule, labelOf, market, badgeClassName }: Props) {
  return (
    <span className="grid w-full grid-cols-1 items-baseline gap-x-4 gap-y-1 sm:grid-cols-2">
      <span className="flex min-w-0 items-baseline gap-2">
        <Badge tone="none" className={cn('shrink-0', badgeClassName)}>{labelOf('orderDirections', rule.direction)}</Badge>
        {/* 접근성 이름에서 배지·라벨·값이 붙지 않게 하는 공백 */}
        {' '}<span className="shrink-0 text-xs font-normal text-muted-foreground">주기</span>{' '}
        <span>{formatDcaRuleWhen(rule, labelOf, market)}</span>
      </span>
      {' '}
      <span className="flex items-baseline gap-2">
        <span className="shrink-0 text-xs font-normal text-muted-foreground">금액</span>{' '}
        <span>{formatDcaSizing(rule.sizing, market)}</span>
      </span>
    </span>
  )
}
