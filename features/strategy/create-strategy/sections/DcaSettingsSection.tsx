'use client'

import { useId } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { isCryptoMarket, type TradingMarket } from '@shared/lib/api-schema'
import { currencyUnit, fmtMoney } from '@shared/lib/format'
import { SelectionCard } from '@shared/ui/selection-card'
import { useMeta } from '@entities/meta'
import { formatExecutionHour, STOCK_WEEKDAYS, WEEKDAY_LABEL, type DcaWeekday } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { DAY_OPTIONS, LAST_DAY, type DcaRuleFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaRuleFormValues>
  market: TradingMarket
  orderTypes: string[]
  frequencies: string[]
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h)
const LATE_DAYS = new Set(['29', '30', '31'])

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>
}

// 규칙 편집 화면의 실행 시점·주기 — 방향은 편집 화면 제목이 보여 주고 바꿀 수 없다(규칙 정체성)
export function DcaSettingsSection({ form, market, orderTypes, frequencies }: Props) {
  const { labelOf } = useMeta()
  const isCrypto = isCryptoMarket(market)
  // 주식은 미국 거래일 기준이라 평일만, 크립토는 24/7이라 7일 모두
  const weekdays = isCrypto ? (Object.keys(WEEKDAY_LABEL) as DcaWeekday[]) : STOCK_WEEKDAYS
  const scheduleErrorId = useId()
  const hourErrorId = useId()
  const { watch, setValue, formState: { errors } } = form
  const orderType = watch('orderType')
  const frequency = watch('frequency')
  const dayOfMonth = watch('dayOfMonth')

  return (
    <>
      {!isCrypto && (
        <div className="py-[18px] border-b border-border">
          <StrategyFieldLabel>주문 방식</StrategyFieldLabel>
          <div className="flex gap-2">
            {orderTypes.map((code) => (
              <SelectionCard key={code} selected={orderType === code} onClick={() => setValue('orderType', code as DcaRuleFormValues['orderType'])}
                className="flex-1 px-3 py-2 text-center">
                <div className="text-sm font-[800]">{labelOf('orderTypes', code)}</div>
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
              <SelectTrigger aria-label="실행 시각" aria-invalid={!!errors.executionHour} aria-describedby={errors.executionHour ? hourErrorId : undefined} className="h-11 w-full"><SelectValue placeholder="시각 선택" /></SelectTrigger>
              <SelectContent>
                {HOUR_OPTIONS.map((h) => (
                  <SelectItem key={h} value={String(h)}>{formatExecutionHour(h)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )} />
          {errors.executionHour && <p id={hourErrorId} className="mt-1 text-sm text-[var(--status-error)]">{errors.executionHour.message}</p>}
          <Caption>한국 시간 기준, 시장가로 주문</Caption>
        </div>
      )}

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>주기</StrategyFieldLabel>
        <div className="flex gap-2">
          {frequencies.map((code) => (
            <SelectionCard key={code} selected={frequency === code} onClick={() => setValue('frequency', code as DcaRuleFormValues['frequency'])}
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

// 부족 시 정책 카드 문구 — 방향별로 뜻이 달라 메타 라벨 대신 UI 상수로 둔다(spec §4.6 빌더 재량)
const SHORTFALL_CARD: Record<DcaRuleFormValues['direction'], Record<DcaRuleFormValues['shortfall'], string>> = {
  BUY: { PARTIAL: '남은 금액만큼 매수', REJECT: '주문 안 함' },
  SELL: { PARTIAL: '잔량 전부 매도', REJECT: '주문 안 함' },
}
const SHORTFALLS = ['PARTIAL', 'REJECT'] as const
const toNumberOrNull = (v: unknown) => (v === '' || v == null ? null : Number(v))

// 규칙 편집 화면의 규모·부족 시 정책 — 보유 비율은 매도 규칙만 쓴다
export function DcaSizingSection({ form, market }: Pick<Props, 'form' | 'market'>) {
  const isCrypto = isCryptoMarket(market)
  const { currency, scale, min } = form.watch('orderAmount')
  const unit = currencyUnit(currency)
  const amountStep = scale > 0 ? String(10 ** -scale) : '1'
  const amountId = useId()
  const percentId = useId()
  const { watch, setValue, register, formState: { errors } } = form
  const direction = watch('direction')
  const sizingType = watch('sizingType')
  const shortfall = watch('shortfall')
  const shortfallLabel = direction === 'SELL' ? '보유가 부족할 때' : `${currency === 'KRW' ? '원화' : currency === 'USDT' ? 'USDT' : '달러'}가 부족할 때`

  return (
    <>
      <div className="py-[18px] border-b border-border">
        {direction === 'SELL' && (
          <div className="mb-3 flex gap-2">
            <SelectionCard selected={sizingType === 'AMOUNT'} onClick={() => setValue('sizingType', 'AMOUNT')}
              className="flex-1 px-3 py-2 text-center text-sm font-[800]">
              금액
            </SelectionCard>
            <SelectionCard selected={sizingType === 'HOLDING_PERCENT'} onClick={() => setValue('sizingType', 'HOLDING_PERCENT')}
              className="flex-1 px-3 py-2 text-center text-sm font-[800]">
              보유 비율 %
            </SelectionCard>
          </div>
        )}
        {sizingType === 'HOLDING_PERCENT' ? (
          <>
            <StrategyFieldLabel htmlFor={percentId}>보유 비율 (%)</StrategyFieldLabel>
            <Input id={percentId} type="number" inputMode="decimal" min={0} max={100} step="0.01"
              aria-invalid={!!errors.percent} aria-describedby={errors.percent ? `${percentId}-error` : undefined}
              {...register('percent', { setValueAs: toNumberOrNull })}
              className="h-11 rounded-[var(--r-sm)] px-3" />
            {errors.percent && <p id={`${percentId}-error`} className="mt-1 text-sm text-[var(--status-error)]">{errors.percent.message}</p>}
            <Caption>100% = 보유 전량</Caption>
          </>
        ) : (
          <>
            <StrategyFieldLabel htmlFor={amountId}>{`회차당 금액 (${unit})`}</StrategyFieldLabel>
            <Input id={amountId} type="number" inputMode={isCrypto && scale === 0 ? 'numeric' : 'decimal'} min={0} step={amountStep}
              placeholder={isCrypto && min > 0 ? `${fmtMoney(min, currency)} 이상` : undefined}
              aria-invalid={!!errors.amount} aria-describedby={errors.amount ? `${amountId}-error` : undefined}
              {...register('amount', { setValueAs: toNumberOrNull })}
              className="h-11 rounded-[var(--r-sm)] px-3" />
            {errors.amount && <p id={`${amountId}-error`} className="mt-1 text-sm text-[var(--status-error)]">{errors.amount.message}</p>}
          </>
        )}
      </div>

      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>{shortfallLabel}</StrategyFieldLabel>
        <div className="flex gap-2">
          {SHORTFALLS.map((code) => (
            <SelectionCard key={code} selected={shortfall === code} onClick={() => setValue('shortfall', code)}
              className="flex-1 px-3 py-2 text-center text-sm font-[800]">
              {SHORTFALL_CARD[direction][code]}
            </SelectionCard>
          ))}
        </div>
        {!isCrypto && direction === 'BUY' && <Caption>주식 매수에는 적용되지 않습니다. 잔고가 부족하면 증권사에서 주문이 거절됩니다.</Caption>}
      </div>
    </>
  )
}
