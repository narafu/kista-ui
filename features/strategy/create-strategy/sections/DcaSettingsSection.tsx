'use client'

import { useId } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { TradingMarket } from '@shared/lib/api-schema'
import { SelectionCard } from '@shared/ui/selection-card'
import { useMeta } from '@entities/meta'
import { formatExecutionHour, STOCK_WEEKDAYS, WEEKDAY_LABEL, type DcaWeekday } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { DAY_OPTIONS, LAST_DAY, type DcaFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaFormValues>
  isEdit: boolean
  market: TradingMarket
  orderTypes: string[]
  directions: string[]
  frequencies: string[]
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)
const LATE_DAYS = new Set(['29', '30', '31'])
const ORDER_TYPE_CAPTION: Record<string, string> = {
  MOO: '장 시작 시 시장가 주문',
  MOC: '장 마감 시 시장가 주문',
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>
}

export function DcaSettingsSection({ form, isEdit, market, orderTypes, directions, frequencies }: Props) {
  const { labelOf } = useMeta()
  const isCrypto = market === 'CRYPTO_KRW'
  // 주식은 미국 거래일 기준이라 평일만, 코인은 24/7이라 7일 모두
  const weekdays = isCrypto ? (Object.keys(WEEKDAY_LABEL) as DcaWeekday[]) : STOCK_WEEKDAYS
  const amountId = useId()
  const scheduleErrorId = useId()
  const { watch, setValue, register, formState: { errors } } = form
  const direction = watch('direction')
  const orderType = watch('orderType')
  const frequency = watch('frequency')
  const dayOfMonth = watch('dayOfMonth')

  return (
    <>
      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>방향</StrategyFieldLabel>
        {isEdit ? (
          <div className="px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted text-sm font-[800]">
            {labelOf('orderDirections', direction)}
          </div>
        ) : (
          <div className="flex gap-2">
            {directions.map((code) => (
              <SelectionCard key={code} selected={direction === code} onClick={() => setValue('direction', code as DcaFormValues['direction'])}
                className="flex-1 px-3 py-2 text-center text-sm font-[800]">
                {labelOf('orderDirections', code)}
              </SelectionCard>
            ))}
          </div>
        )}
      </div>

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel htmlFor={amountId}>{isCrypto ? '회차당 금액 (원)' : '회차당 금액 (USD)'}</StrategyFieldLabel>
        <Input id={amountId} type="number" inputMode={isCrypto ? 'numeric' : 'decimal'} min={0} step={isCrypto ? '1' : '0.01'}
          placeholder={isCrypto ? '5,000원 이상' : undefined}
          aria-invalid={!!errors.amount} aria-describedby={errors.amount ? `${amountId}-error` : undefined}
          {...register('amount', { setValueAs: (v) => (v === '' || v == null ? null : Number(v)) })}
          className="h-11 rounded-[var(--r-sm)] px-3" />
        {errors.amount && <p id={`${amountId}-error`} className="mt-1 text-sm text-[var(--status-error)]">{errors.amount.message}</p>}
      </div>

      {!isCrypto && (
        <div className="py-[18px] border-b border-border">
          <StrategyFieldLabel>주문 방식</StrategyFieldLabel>
          <div className="flex gap-2">
            {orderTypes.map((code) => (
              <SelectionCard key={code} selected={orderType === code} onClick={() => setValue('orderType', code as DcaFormValues['orderType'])}
                className="flex-1 px-3 py-2 text-center">
                <div className="text-sm font-[800]">{labelOf('orderTypes', code)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{ORDER_TYPE_CAPTION[code]}</div>
              </SelectionCard>
            ))}
          </div>
        </div>
      )}

      {isCrypto && (
        <div className="py-[18px] border-b border-border">
          <StrategyFieldLabel>실행 시각</StrategyFieldLabel>
          <Controller control={form.control} name="executionHour" render={({ field }) => (
            <Select items={HOUR_OPTIONS.map((h) => ({ value: String(h), label: formatExecutionHour(h) }))}
              value={field.value == null ? '' : String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
              <SelectTrigger aria-label="실행 시각" aria-invalid={!!errors.executionHour} className="h-11 w-full"><SelectValue placeholder="시각 선택" /></SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{formatExecutionHour(h)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.executionHour && <p className="mt-1 text-sm text-[var(--status-error)]">{errors.executionHour.message}</p>}
          <Caption>한국 시간 기준, 시장가로 주문</Caption>
        </div>
      )}

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>주기</StrategyFieldLabel>
        <div className="flex gap-2">
          {frequencies.map((code) => (
            <SelectionCard key={code} selected={frequency === code} onClick={() => setValue('frequency', code as DcaFormValues['frequency'])}
              className="flex-1 px-3 py-2 text-center text-sm font-[800]">
              {labelOf('dcaFrequencies', code)}
            </SelectionCard>
          ))}
        </div>

        {frequency === 'WEEKLY' && (
          <Controller control={form.control} name="dayOfWeek" render={({ field }) => (
            <Select items={weekdays.map((d) => ({ value: d, label: WEEKDAY_LABEL[d] }))}
              value={field.value ?? ''} onValueChange={(v) => field.onChange(v as DcaWeekday)}>
              <SelectTrigger aria-label="실행 요일" aria-invalid={!!errors.dayOfWeek} aria-describedby={errors.dayOfWeek ? scheduleErrorId : undefined} className="mt-3 h-11 w-full"><SelectValue placeholder="요일 선택" /></SelectTrigger>
              <SelectContent>
                {weekdays.map((d) => (
                  <SelectItem key={d} value={d}>{WEEKDAY_LABEL[d]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        )}

        {frequency === 'MONTHLY' && (
          <Controller control={form.control} name="dayOfMonth" render={({ field }) => (
            <Select items={DAY_OPTIONS.map((d) => ({ value: d, label: d === LAST_DAY ? '말일' : `${d}일` }))}
              value={field.value ?? ''} onValueChange={field.onChange}>
              <SelectTrigger aria-label="실행 날짜" aria-invalid={!!errors.dayOfMonth} aria-describedby={errors.dayOfMonth ? scheduleErrorId : undefined} className="mt-3 h-11 w-full"><SelectValue placeholder="날짜 선택" /></SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d === LAST_DAY ? '말일' : `${d}일`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
        )}

        {(errors.dayOfWeek || errors.dayOfMonth) && (
          <p id={scheduleErrorId} className="mt-1 text-sm text-[var(--status-error)]">{errors.dayOfWeek?.message ?? errors.dayOfMonth?.message}</p>
        )}
        {frequency === 'MONTHLY' && dayOfMonth && LATE_DAYS.has(dayOfMonth) && <Caption>해당 날짜가 없는 달은 말일에 실행</Caption>}
        {!isCrypto && <Caption>휴장일이면 같은 주·월 안의 다음 거래일에 실행</Caption>}
      </div>
    </>
  )
}
