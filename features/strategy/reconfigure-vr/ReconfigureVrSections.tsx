'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Label } from '@/components/ui/label'
import { AmountInput } from '@shared/ui/AmountInput'
import { SectionTitle } from '@shared/ui/SectionTitle'
import { fmtMoney } from '@shared/lib/format'
import { floorToCents, RecurringModeField, VrRampFields, type VrRampValues, type VrRecurringMode } from '@entities/strategy'
import type { ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/reconfigureVrStrategy'

interface SectionProps {
  form: UseFormReturn<ReconfigureVrFormValues>
  vr: ReconfigureVrStrategy['vr']
  disabled: boolean
}

const toUndef = (v: number | null) => v ?? undefined

// 칸 오류 — id는 입력의 errorId(aria-invalid·설명 연결, 막힌 제출의 포커스 대상), node는 칸 아래 문구
function fieldError(form: SectionProps['form'], name: keyof ReconfigureVrFormValues) {
  const message = form.formState.errors[name]?.message
  const id = message ? `${name}-error` : undefined
  return { id, node: message && <p id={id} role="alert" className="text-sm text-status-error">{message}</p> }
}

// 기존 전략 재설정은 런타임 허용 목록(신규 생성 제약)을 적용하지 않는다 — setting을 생략하면 전부 잠기므로 모두 허용으로 넘긴다
const ALL_RECURRING_MODES = { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'] }

export function initialRecurringMode(recurringAmount: number): VrRecurringMode {
  if (recurringAmount > 0) return 'DEPOSIT'
  return recurringAmount < 0 ? 'WITHDRAW' : 'HOLD'
}

export function ParamsSection({ form, vr, disabled }: SectionProps) {
  const recurringMode = form.watch('recurringMode') ?? initialRecurringMode(vr.recurringAmount)
  const bandWidthError = fieldError(form, 'bandWidth')
  const intervalWeeksError = fieldError(form, 'intervalWeeks')
  const recurringError = fieldError(form, 'recurringAmount')

  // 폼 값은 부호 있는 금액, 입력칸은 크기만 다룬다 — 부호는 mode가 결정. 비운 칸(null)은 제출 시 0
  function signed(mode: VrRecurringMode, magnitude: number | null) {
    if (magnitude === null || magnitude === 0) return magnitude
    return mode === 'WITHDRAW' ? -Math.abs(magnitude) : mode === 'DEPOSIT' ? Math.abs(magnitude) : 0
  }

  function handleRecurringModeChange(mode: VrRecurringMode) {
    form.setValue('recurringMode', mode)
    // 거치에서 적립으로 막 바꾼 순간(금액 0)엔 오류를 띄우지 않는다 — 이미 떠 있는 오류만 새 모드로 다시 검사
    form.setValue('recurringAmount', signed(mode, mode === 'HOLD' ? 0 : form.getValues('recurringAmount') ?? null), {
      shouldValidate: Boolean(form.formState.errors.recurringAmount),
    })
  }

  return (
      <section className="space-y-4">
        <SectionTitle>파라미터</SectionTitle>
        <div className="space-y-2">
          <Label htmlFor="bandWidth">밴드 폭</Label>
          <AmountInput id="bandWidth" unit="%" disabled={disabled} value={form.watch('bandWidth') ?? null} errorId={bandWidthError.id}
            onChange={(v) => form.setValue('bandWidth', toUndef(v), { shouldValidate: true })} />
          {bandWidthError.node}
        </div>
        <div className="space-y-2">
          <Label htmlFor="intervalWeeks">리밸런싱 주기</Label>
          <AmountInput id="intervalWeeks" maxDecimals={0} unit="주" disabled={disabled} value={form.watch('intervalWeeks') ?? null} errorId={intervalWeeksError.id}
            onChange={(v) => form.setValue('intervalWeeks', toUndef(v), { shouldValidate: true })} />
          {intervalWeeksError.node}
        </div>
        <RecurringModeField
          mode={recurringMode}
          setMode={handleRecurringModeChange}
          amount={form.watch('recurringAmount') ?? null}
          setAmount={(v) => form.setValue('recurringAmount', signed(recurringMode, v), { shouldValidate: true })}
          disabled={disabled}
          setting={ALL_RECURRING_MODES}
          errorId={recurringError.id}
        />
        {recurringError.node}
      </section>
  )
}

const RAMP_FIELDS = [
  'initialGradient', 'gGraceWeeks', 'gStepWeeks', 'gMax',
  'initialPoolLimitRate', 'pGraceWeeks', 'pStepWeeks', 'poolLimitFloor',
] as const

export function RampSection({ form, vr, disabled }: SectionProps) {
  const values = form.watch()
  const fields = Object.fromEntries(RAMP_FIELDS.map((f) => [f, values[f] ?? null])) as unknown as VrRampValues
  const { errors } = form.formState

  return (
      <section className="space-y-4">
        <SectionTitle>램프 설정</SectionTitle>
        {/* 비운 램프 값은 서버가 현재 활성 버전 값을 그대로 이어받는다(inheritFrom) — placeholder도 현재 값 */}
        <VrRampFields
          fields={fields}
          setField={(f, v) => form.setValue(f, v ?? undefined, { shouldValidate: true, shouldDirty: true })}
          disabled={disabled}
          rampDefaults={vr}
          errors={Object.fromEntries(RAMP_FIELDS.map((f) => [f, errors[f]?.message]))}
        />
      </section>
  )
}

export function InjectSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  const injectShares = form.watch('injectShares')
  const sharesError = fieldError(form, 'injectShares')
  const priceError = fieldError(form, 'injectSharePrice')
  const depositError = fieldError(form, 'injectDeposit')
  // null은 손대지 않은 칸 — 한 번 입력한 매수단가 칸은 주식 수를 지워도 남겨, 고치는 중에 사라지거나 오류가 숨지 않게 한다
  const priceTouched = form.watch('injectSharePrice') !== null

  return (
      <section className="space-y-4 rounded-sm border border-border p-4">
        <SectionTitle>투자금 추가 (선택)</SectionTitle>
        <p className="text-xs text-muted-foreground">설정 변경과 별개로 보유 주식·예수금을 추가로 편입합니다. 비워두면 추가하지 않습니다.</p>
        <div className="space-y-2">
          <Label htmlFor="injectShares">편입 주식 수</Label>
          <AmountInput id="injectShares" unit="주" unitClassName="ml-1.5" maxDecimals={0} placeholder="0" disabled={disabled}
            value={injectShares ?? null} errorId={sharesError.id}
            onChange={(v) => {
              form.setValue('injectShares', toUndef(v), { shouldValidate: true })
              // 매수단가 필수 여부가 주식 수에 달렸다 — 이미 뜬 오류만 다시 검사한다(제출 전에 새로 띄우지 않는다)
              if (priceError.id) void form.trigger('injectSharePrice')
            }} />
          {sharesError.node}
        </div>
        {((injectShares ?? 0) > 0 || priceTouched) && (
          <div className="space-y-2">
            <Label htmlFor="injectSharePrice">매수단가</Label>
            <AmountInput id="injectSharePrice" unit="USD" currency="USD" unitClassName="ml-2" disabled={disabled}
              value={form.watch('injectSharePrice') ?? null} errorId={priceError.id}
              onChange={(v) => form.setValue('injectSharePrice', toUndef(v), { shouldValidate: true })} />
            {priceError.node}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="injectDeposit">추가 예수금</Label>
          <AmountInput id="injectDeposit" unit="USD" unitClassName="ml-2" currency="USD" placeholder="0" disabled={disabled}
            value={form.watch('injectDeposit') ?? null} errorId={depositError.id}
            onChange={(v) => form.setValue('injectDeposit', v, { shouldValidate: true })} />
          {depositError.node}
        </div>
      </section>
  )
}

export function WithdrawSection({ form, disabled, ledgerDeposit }: Omit<SectionProps, 'vr'> & { ledgerDeposit?: number }) {
  const sharesError = fieldError(form, 'withdrawShares')
  const depositError = fieldError(form, 'withdrawDeposit')

  return (
      <section className="space-y-4 rounded-sm border border-border p-4">
        <SectionTitle>투자금 인출 (선택)</SectionTitle>
        <p className="text-xs text-muted-foreground">보유 주식·예수금 중 일부를 전략에서 빼냅니다. 비워두면 인출하지 않습니다.</p>
        {ledgerDeposit != null && <p className="text-sm text-muted-foreground">현재 장부 예수금 {fmtMoney(floorToCents(ledgerDeposit), 'USD')}</p>}
        <div className="space-y-2">
          <Label htmlFor="withdrawShares">인출 주식 수</Label>
          <AmountInput id="withdrawShares" unit="주" unitClassName="ml-1.5" maxDecimals={0} placeholder="0" disabled={disabled}
            value={form.watch('withdrawShares') ?? null} errorId={sharesError.id}
            onChange={(v) => form.setValue('withdrawShares', toUndef(v), { shouldValidate: true })} />
          {sharesError.node}
        </div>
        <div className="space-y-2">
          <Label htmlFor="withdrawDeposit">인출 예수금</Label>
          <AmountInput id="withdrawDeposit" unit="USD" unitClassName="ml-2" currency="USD" placeholder="0" disabled={disabled}
            value={form.watch('withdrawDeposit') ?? null} errorId={depositError.id}
            onChange={(v) => form.setValue('withdrawDeposit', v, { shouldValidate: true })} />
          {depositError.node}
        </div>
      </section>
  )
}
