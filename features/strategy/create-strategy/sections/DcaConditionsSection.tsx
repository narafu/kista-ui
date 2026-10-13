'use client'

import { useId } from 'react'
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useMeta } from '@entities/meta'
import type { DcaIndicator, DcaOperator } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { MAX_DCA_CONDITIONS, type DcaFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaFormValues>
  indicators: string[]
  direction: DcaFormValues['direction']
}

const THRESHOLD_SUFFIX: Partial<Record<DcaIndicator, string>> = { AVG_PRICE: '%' }

export function DcaConditionsSection({ form, indicators, direction }: Props) {
  const { meta, labelOf } = useMeta()
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'conditions' })
  const conditions = form.watch('conditions')
  const errorIdBase = useId()
  // 새 조건 기본값은 메타 첫 항목 — 메타가 비면 추가 버튼을 숨긴다
  const defaultIndicator = indicators[0] as DcaIndicator | undefined
  const defaultOperator = meta.dcaOperators?.[0]?.code as DcaOperator | undefined
  const conditionErrors = form.formState.errors.conditions
  const listError = conditionErrors?.root?.message ?? conditionErrors?.message // 최대 개수 등 배열 단위 오류

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>추가 조건 (모두 충족 시 주문)</StrategyFieldLabel>
      <p className="mb-2 text-sm text-muted-foreground">평단가·보유 수량은 계좌 전체 보유 기준</p>
      {direction === 'BUY' && <p className="mb-2 text-sm text-muted-foreground">보유 0주일 때는 평단가 조건 없이 매수</p>}

      {fields.length === 0 && <p className="py-2 text-sm text-muted-foreground">조건 없이 매 회차 주문</p>}

      <div className="space-y-2">
        {fields.map((f, i) => {
          const indicator = conditions[i]?.indicator
          const smaPeriods = (meta.dcaIndicators ?? []).find((m) => m.code === indicator)?.smaPeriods ?? []
          const rowError = conditionErrors?.[i]
          // 지표·연산자 오류(메타에 없는 코드 등)는 대응 입력이 없어 일반 문구로 표시
          const rowErrorMessage = rowError?.smaPeriod?.message ?? rowError?.threshold?.message ?? (rowError ? '조건 입력값을 확인하세요.' : undefined)
          const errorId = rowErrorMessage ? `${errorIdBase}-${i}` : undefined
          return (
            <div key={f.id}>
              <div className="flex items-center gap-2">
                <Controller control={form.control} name={`conditions.${i}.indicator`} render={({ field }) => (
                  <Select items={indicators.map((code) => ({ value: code, label: labelOf('dcaIndicators', code) }))}
                    value={field.value} onValueChange={(v) => {
                    field.onChange(v as DcaIndicator)
                    form.setValue(`conditions.${i}.threshold`, null)
                    form.setValue(`conditions.${i}.smaPeriod`, null)
                    form.clearErrors([`conditions.${i}.threshold`, `conditions.${i}.smaPeriod`])
                  }}>
                    <SelectTrigger aria-label={`조건 ${i + 1} 지표`} className="h-11 flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {indicators.map((code) => <SelectItem key={code} value={code}>{labelOf('dcaIndicators', code)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />

                {indicator === 'SMA' ? (
                  <Controller control={form.control} name={`conditions.${i}.smaPeriod`} render={({ field }) => (
                    <Select items={smaPeriods.map((p) => ({ value: String(p), label: `${p}일` }))}
                      value={field.value != null ? String(field.value) : ''} onValueChange={(v) => field.onChange(Number(v))}>
                      <SelectTrigger aria-label={`조건 ${i + 1} 이동평균 기간`} aria-invalid={!!rowError?.smaPeriod} aria-describedby={errorId} className="h-11 w-24"><SelectValue placeholder="기간" /></SelectTrigger>
                      <SelectContent>
                        {smaPeriods.map((p) => <SelectItem key={p} value={String(p)}>{p}일</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )} />
                ) : (
                  <label className="flex items-center gap-1">
                    <span className="sr-only">{`조건 ${i + 1} 기준값`}</span>
                    <Input type="number" step="any" aria-invalid={!!rowError?.threshold} aria-describedby={errorId}
                      {...form.register(`conditions.${i}.threshold`, { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
                      className="h-11 w-20 rounded-[var(--r-sm)] px-2" />
                    {indicator && THRESHOLD_SUFFIX[indicator] && <span className="text-sm">{THRESHOLD_SUFFIX[indicator]}</span>}
                  </label>
                )}

                <Controller control={form.control} name={`conditions.${i}.operator`} render={({ field }) => (
                  <Select items={(meta.dcaOperators ?? []).map((o) => ({ value: o.code, label: o.label }))}
                    value={field.value} onValueChange={(v) => field.onChange(v as DcaOperator)}>
                    <SelectTrigger aria-label={`조건 ${i + 1} 비교`} className="h-11 w-20"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(meta.dcaOperators ?? []).map((o) => <SelectItem key={o.code} value={o.code}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )} />

                <Button type="button" variant="ghost" size="icon" aria-label={`조건 ${i + 1} 삭제`} onClick={() => remove(i)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
              {rowErrorMessage && <p id={errorId} className="mt-1 text-sm text-[var(--status-error)]">{rowErrorMessage}</p>}
            </div>
          )
        })}
      </div>

      {listError && <p className="mt-1 text-sm text-[var(--status-error)]">{listError}</p>}

      {fields.length < MAX_DCA_CONDITIONS && defaultIndicator && defaultOperator && <Button type="button" variant="brand-soft" size="sm" className="mt-3"
        onClick={() => append({ indicator: defaultIndicator, operator: defaultOperator, threshold: null, smaPeriod: null })}>
        조건 추가
      </Button>}
    </div>
  )
}
