'use client'

import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TradingMarket } from '@shared/lib/api-schema'
import { cn } from '@shared/lib/utils'
import { Badge } from '@shared/ui/Badge'
import { useMeta } from '@entities/meta'
import { dcaIndicatorLabel, formatDcaCondition, formatDcaRuleSummary, type DcaDirection } from '@entities/strategy'
import { directionBadgeClass } from '@entities/trade'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { LAST_DAY, MAX_DCA_RULES, type DcaRuleFormValues } from '../model/dcaFormSchema'

interface Props {
  rules: DcaRuleFormValues[]
  market: TradingMarket
  onSelect: (index: number) => void
  onAdd: (direction: DcaDirection) => void
  registerRowRef: (index: number, el: HTMLButtonElement | null) => void
  error?: string
}

const SUMMARY_SEPARATOR = ' · '

// 폼 값(dayOfMonth 문자열, sizing 평탄화)을 공용 요약 포맷터 입력으로 바꾼다
function toSummaryInput(r: DcaRuleFormValues) {
  return {
    ...r,
    dayOfMonth: r.dayOfMonth && r.dayOfMonth !== LAST_DAY ? Number(r.dayOfMonth) : null,
    sizing: { type: r.sizingType, amount: r.amount, percent: r.percent },
  }
}

export function DcaRuleList({ rules, market, onSelect, onAdd, registerRowRef, error }: Props) {
  const { labelOf } = useMeta()
  const isCrypto = market === 'CRYPTO_KRW'

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>규칙 ({rules.length}/{MAX_DCA_RULES})</StrategyFieldLabel>
      {(rules.length === 0 || error) && (
        <p className={cn('py-2 text-sm', error ? 'text-[var(--status-error)]' : 'text-muted-foreground')}>{error ?? '규칙을 추가하세요.'}</p>
      )}
      <ul className="space-y-2">
        {rules.map((r, i) => {
          // 요약 첫 토막은 방향 — 배지로 보여 주고 나머지를 이어 쓴다
          const [direction, ...rest] = formatDcaRuleSummary(toSummaryInput(r), labelOf, isCrypto).split(SUMMARY_SEPARATOR)
          const conditions = r.conditions.length === 0
            ? '조건 없이 매 회차 주문'
            : r.conditions.map((c) => formatDcaCondition(
              { indicator: c.indicator, operator: c.operator, threshold: c.threshold ?? undefined, smaPeriod: c.smaPeriod ?? undefined },
              dcaIndicatorLabel(c.indicator, labelOf('dcaIndicators', c.indicator), isCrypto),
              labelOf('dcaOperators', c.operator),
            )).join(' AND ')
          return (
            // 인덱스 키 — 행에 내부 상태가 없고 포커스 복귀도 인덱스로 찾는다
            <li key={i}>
              <button type="button" ref={(el) => registerRowRef(i, el)} onClick={() => onSelect(i)}
                className="flex w-full items-center gap-3 rounded-[var(--r-sm)] border border-border bg-card px-3 py-2.5 text-left hover:border-[var(--selection-hover-border)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Badge tone="none" className={directionBadgeClass(r.direction)}>{direction}</Badge>
                    {/* 접근성 이름에서 배지와 요약이 붙지 않게 하는 공백 */}
                    {' '}{rest.join(SUMMARY_SEPARATOR)}
                  </span>
                  <span className="mt-0.5 block text-sm text-muted-foreground">
                    {/* 접근성 이름에서 1행과 2행이 붙지 않게 하는 공백 */}
                    {' '}{conditions}{SUMMARY_SEPARATOR}{labelOf('dcaShortfallPolicies', r.shortfall)}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
      {rules.length < MAX_DCA_RULES && (
        <div className="mt-3 flex gap-2">
          <Button type="button" variant="brand-soft" size="sm" data-add-direction="BUY" onClick={() => onAdd('BUY')}>+ 매수 규칙 추가</Button>
          <Button type="button" variant="brand-soft" size="sm" data-add-direction="SELL" onClick={() => onAdd('SELL')}>+ 매도 규칙 추가</Button>
        </div>
      )}
    </div>
  )
}
