'use client'

import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { isCryptoMarket, type TradingMarket } from '@shared/lib/api-schema'
import { Badge } from '@shared/ui/Badge'
import { FormActions } from '@shared/ui/FormActions'
import { useMeta } from '@entities/meta'
import { directionBadgeClass } from '@entities/trade'
import { DcaSettingsSection, DcaSizingSection } from './DcaSettingsSection'
import { DcaConditionsSection } from './DcaConditionsSection'
import { dcaRuleSchema, type DcaRuleFormValues } from '../model/dcaFormSchema'

interface Props {
  market: TradingMarket
  initial: DcaRuleFormValues
  isNew: boolean
  onDone: (v: DcaRuleFormValues) => void
  onDelete?: () => void
  onCancel: () => void
}

// 규칙 하나의 편집 화면 — 자체 초안 폼이라 "이전"은 부모 규칙 목록을 건드리지 않는다.
// 부모 <form> 밖에서 렌더해야 한다(중첩 form이면 Enter·완료가 부모 제출로 이어진다)
export function DcaRuleEditor({ market, initial, isNew, onDone, onDelete, onCancel }: Props) {
  const { findStrategyType, labelOf } = useMeta()
  const typeMeta = findStrategyType('DCA')
  const form = useForm<DcaRuleFormValues>({ resolver: zodResolver(dcaRuleSchema), defaultValues: initial })
  const titleRef = useRef<HTMLHeadingElement>(null)
  const direction = initial.direction

  useEffect(() => { titleRef.current?.focus() }, [])

  return (
    <form onSubmit={form.handleSubmit((v) => onDone(v))}>
      <button type="button" onClick={onCancel}
        className="mb-1 text-sm font-semibold text-[var(--brand-fg-soft)] hover:underline">
        ← 규칙 목록
      </button>
      <h2 ref={titleRef} tabIndex={-1} className="flex items-center gap-2 pb-2 text-lg font-[800] outline-none">
        <Badge tone="none" size="md" className={directionBadgeClass(direction)}>{labelOf('orderDirections', direction)}</Badge>
        {' '}규칙
      </h2>
      <DcaSettingsSection
        form={form}
        market={market}
        orderTypes={(typeMeta?.orderTypes ?? []).filter((code) => (code === 'MARKET') === isCryptoMarket(market))}
        frequencies={typeMeta?.frequencies ?? []}
      />
      <DcaConditionsSection form={form} market={market} indicators={typeMeta?.conditionIndicators ?? []} direction={direction} />
      <DcaSizingSection form={form} market={market} />
      {!isNew && onDelete && (
        <Button type="button" variant="destructive" size="form" className="mt-6 w-full" onClick={onDelete}>
          규칙 삭제
        </Button>
      )}
      <FormActions onCancel={onCancel} cancelLabel="이전" isPending={false} canSubmit label="완료" className="py-6" />
    </form>
  )
}
