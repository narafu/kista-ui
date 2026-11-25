'use client'

import { useId } from 'react'
import { Controller, type UseFormReturn } from 'react-hook-form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectionCard } from '@shared/ui/selection-card'
import { AmountInput } from '@shared/ui/AmountInput'
import { useMeta } from '@entities/meta'
import { STOCK_WEEKDAYS, WEEKDAY_LABEL, type DcaWeekday } from '@entities/strategy'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { DAY_OPTIONS, LAST_DAY, type DcaRuleFormValues } from '../model/dcaFormSchema'

interface Props {
  form: UseFormReturn<DcaRuleFormValues>
  orderTypes: string[]
  frequencies: string[]
}

const LATE_DAYS = new Set(['29', '30', '31'])

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground">{children}</p>
}

// 규칙 편집 화면의 실행 시점·주기 — 방향은 편집 화면 제목이 보여 주고 바꿀 수 없다(규칙 정체성)
export function DcaSettingsSection({ form, orderTypes, frequencies }: Props) {
  const { meta, labelOf } = useMeta()
  // 화면 전역의 주문 유형은 코드형 짧은 이름이라, 고르는 이 폼에서만 서버 라벨의 괄호 설명("종가시장가")을 덧붙인다
  const orderTypeHint = (code: string) => meta.orderTypes.find((t) => t.code === code)?.label?.match(/\((.*)\)$/)?.[1]
  // 미국 거래일 기준이라 평일만
  const weekdays = STOCK_WEEKDAYS
  const scheduleErrorId = useId()
  const { watch, setValue, formState: { errors } } = form
  const orderType = watch('orderType')
  const frequency = watch('frequency')
  const dayOfMonth = watch('dayOfMonth')

  return (
    <>
      <div className="py-[18px] border-b border-border">
        <StrategyFieldLabel>주문 방식</StrategyFieldLabel>
        <div className="flex gap-2">
          {orderTypes.map((code) => (
            <SelectionCard key={code} selected={orderType === code} onClick={() => setValue('orderType', code as DcaRuleFormValues['orderType'])}
              className="flex-1 px-3 py-2 text-center">
              <div className="text-sm font-[800]">{labelOf('orderTypes', code)}</div>
              {orderTypeHint(code) && <div className="text-xs text-muted-foreground">{orderTypeHint(code)}</div>}
            </SelectionCard>
          ))}
        </div>
      </div>

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
          <p id={scheduleErrorId} className="mt-1 text-sm text-status-error">{errors.dayOfWeek?.message ?? errors.dayOfMonth?.message}</p>
        )}
        {frequency === 'MONTHLY' && dayOfMonth && LATE_DAYS.has(dayOfMonth) && <Caption>해당 날짜가 없는 달은 말일에 실행</Caption>}
        <Caption>휴장일이면 같은 주·월 안의 다음 거래일에 실행</Caption>
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

// 규칙 편집 화면의 규모·부족 시 정책 — 보유 비율은 매도 규칙만 쓴다
export function DcaSizingSection({ form }: Pick<Props, 'form'>) {
  const amountId = useId()
  const percentId = useId()
  const { watch, setValue, formState: { errors } } = form
  const direction = watch('direction')
  const sizingType = watch('sizingType')
  const shortfall = watch('shortfall')
  const shortfallLabel = direction === 'SELL' ? '보유가 부족할 때' : '달러가 부족할 때'

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
            <StrategyFieldLabel htmlFor={percentId}>보유 비율</StrategyFieldLabel>
            <Controller control={form.control} name="percent" render={({ field }) => (
              <AmountInput id={percentId} value={field.value} ref={field.ref} onBlur={field.onBlur} onChange={field.onChange} unit="%" maxDecimals={2} disabled={false}
                errorId={errors.percent ? `${percentId}-error` : undefined} />
            )} />
            {errors.percent && <p id={`${percentId}-error`} className="mt-1 text-sm text-status-error">{errors.percent.message}</p>}
            <Caption>100% = 보유 전량</Caption>
          </>
        ) : (
          <>
            <StrategyFieldLabel htmlFor={amountId}>회차당 금액</StrategyFieldLabel>
            <Controller control={form.control} name="amount" render={({ field }) => (
              <AmountInput id={amountId} value={field.value} ref={field.ref} onBlur={field.onBlur} onChange={field.onChange} unit="USD" currency="USD" disabled={false}
                errorId={errors.amount ? `${amountId}-error` : undefined} />
            )} />
            {errors.amount && <p id={`${amountId}-error`} className="mt-1 text-sm text-status-error">{errors.amount.message}</p>}
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
        {direction === 'BUY' && <Caption>증권사 주문가능 달러에서 같은 계좌 다른 전략의 원장 예수금을 뺀 남은 달러 기준입니다.</Caption>}
        {direction === 'SELL' && <Caption>전략 보유 수량과 증권사 판매가능 수량 중 적은 쪽 기준입니다.</Caption>}
      </div>
    </>
  )
}
