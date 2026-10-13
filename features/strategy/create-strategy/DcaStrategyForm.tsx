'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { FormActions } from '@shared/ui/FormActions'
import { useMeta } from '@entities/meta'
import { useCreateStrategyMutation, useReconfigureDcaMutation } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { DcaSettingsSection } from './sections/DcaSettingsSection'
import { DcaConditionsSection } from './sections/DcaConditionsSection'
import { buildDcaFormDefaults, dcaFormSchema, type DcaFormValues } from './model/dcaFormSchema'
import { buildDcaConfig, buildDcaCreatePayload } from './model/buildDcaPayload'

interface Props {
  accountId: string
  broker?: string
  initial?: Strategy
  availableTickers: string[] // 런타임 설정 허용 티커 (StrategyForm이 계산해 전달)
  defaultTicker: string // 런타임 설정 기본 티커 (deriveRuntimeFields가 허용 목록 기준으로 확정)
  onSuccess?: () => void
  onCancel?: () => void
}

// DCA 등록·수정 — 시드·분할·VR이 엮인 useStrategyForm과 분리된 자체 폼(spec A'안)
export function DcaStrategyForm({ accountId, broker, initial, availableTickers, defaultTicker, onSuccess, onCancel }: Props) {
  const { findStrategyType } = useMeta()
  const typeMeta = findStrategyType('DCA')
  const form = useForm<DcaFormValues>({
    resolver: zodResolver(dcaFormSchema),
    defaultValues: buildDcaFormDefaults(initial, defaultTicker),
  })
  const done = () => {
    toast.success(initial ? '전략이 수정되었습니다' : '전략이 등록되었습니다')
    onSuccess?.()
  }
  const create = useCreateStrategyMutation(accountId)
  const reconfigure = useReconfigureDcaMutation(initial?.id ?? '')
  const pending = create.isPending || reconfigure.isPending
  const ticker = form.watch('ticker')
  const direction = form.watch('direction')

  const submit = form.handleSubmit((values) => {
    if (initial) reconfigure.mutate(buildDcaConfig(values), { onSuccess: done })
    else create.mutate(buildDcaCreatePayload(values), { onSuccess: done })
  })

  return (
    <form onSubmit={submit}>
      <StrategyTickerSection
        initial={initial}
        ticker={ticker}
        availableTickers={availableTickers}
        prices={null}
        basePrice={null}
        loading={pending}
        onTickerChange={(code) => form.setValue('ticker', code)}
        customizable={availableTickers.length > 1}
      />
      {!initial && (
        <ScheduledStartSection
          value={form.watch('scheduledStartDate')}
          onChange={(d) => form.setValue('scheduledStartDate', d)}
          loading={pending}
        />
      )}
      <DcaSettingsSection
        form={form}
        isEdit={!!initial}
        broker={broker}
        orderTypes={typeMeta?.orderTypes ?? []}
        directions={typeMeta?.directions ?? []}
        frequencies={typeMeta?.frequencies ?? []}
      />
      <DcaConditionsSection form={form} indicators={typeMeta?.conditionIndicators ?? []} direction={direction} />
      <FormActions onCancel={onCancel} isPending={pending} canSubmit={!pending} label={initial ? '수정' : '등록'} className="py-6" />
    </form>
  )
}
