'use client'

import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { UnitInput } from '@shared/ui/UnitInput'
import { RecurringModeField, VrRampFields, type VrRampValues, type VrRecurringMode } from '@entities/strategy'
import type { ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/reconfigureVrStrategy'

interface SectionProps {
  form: UseFormReturn<ReconfigureVrFormValues>
  vr: ReconfigureVrStrategy['vr']
  disabled: boolean
}

const toUndef = (v: number | null) => v ?? undefined

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

// 기존 전략 재설정은 런타임 허용 목록(신규 생성 제약)을 적용하지 않는다 — setting을 생략하면 전부 잠기므로 모두 허용으로 넘긴다
const ALL_RECURRING_MODES = { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'] }

export function initialRecurringMode(recurringAmount: number): VrRecurringMode {
  if (recurringAmount > 0) return 'DEPOSIT'
  return recurringAmount < 0 ? 'WITHDRAW' : 'HOLD'
}

export function ParamsSection({ form, vr, disabled }: SectionProps) {
  const recurringMode = form.watch('recurringMode') ?? initialRecurringMode(vr.recurringAmount)
  const recurringError = form.formState.errors.recurringAmount?.message

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
        <h2 className="text-sm font-bold text-foreground">파라미터</h2>
        <div className="space-y-2">
          <Label htmlFor="bandWidth">밴드 폭</Label>
          <UnitInput id="bandWidth" unit="%" disabled={disabled} value={form.watch('bandWidth') ?? null}
            onChange={(v) => form.setValue('bandWidth', toUndef(v), { shouldValidate: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intervalWeeks">리밸런싱 주기</Label>
          <UnitInput id="intervalWeeks" maxDecimals={0} unit="주" disabled={disabled} value={form.watch('intervalWeeks') ?? null}
            onChange={(v) => form.setValue('intervalWeeks', toUndef(v), { shouldValidate: true })} />
        </div>
        <RecurringModeField
          mode={recurringMode}
          setMode={handleRecurringModeChange}
          amount={form.watch('recurringAmount') ?? null}
          setAmount={(v) => form.setValue('recurringAmount', signed(recurringMode, v), { shouldValidate: true })}
          disabled={disabled}
          setting={ALL_RECURRING_MODES}
          errorId={recurringError ? 'recurringAmount-error' : undefined}
        />
        {recurringError && <p id="recurringAmount-error" className="mt-1 text-sm text-destructive">{recurringError}</p>}
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
        <h2 className="text-sm font-bold text-foreground">램프 설정</h2>
        {/* 비운 램프 값은 서버가 현재 활성 버전 값을 그대로 이어받는다(inheritFrom) — placeholder도 현재 값 */}
        <VrRampFields
          fields={fields}
          setField={(f, v) => form.setValue(f, v ?? undefined, { shouldValidate: true, shouldDirty: true })}
          disabled={disabled}
          rampDefaults={vr}
          errors={{ gMax: errors.gMax?.message, poolLimitFloor: errors.poolLimitFloor?.message }}
        />
      </section>
  )
}

export function InjectSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  const injectShares = form.watch('injectShares')

  return (
      <section className="space-y-4 rounded-[var(--r-sm)] border border-border p-4">
        <h2 className="text-sm font-bold text-foreground">투자금 추가 (선택)</h2>
        <p className="text-xs text-muted-foreground">설정 변경과 별개로 보유 주식·예수금을 추가로 편입합니다. 비워두면 추가하지 않습니다.</p>
        <div className="space-y-2">
          <Label htmlFor="injectShares">편입 주식 수</Label>
          <Input id="injectShares" type="text" inputMode="numeric" placeholder="0" disabled={disabled}
            onChange={(e) => form.setValue('injectShares', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
        </div>
        {injectShares != null && injectShares > 0 && (
          <div className="space-y-2">
            <Label htmlFor="injectSharePrice">매수단가</Label>
            <UnitInput id="injectSharePrice" unit="USD" unitClassName="ml-2" disabled={disabled}
            value={form.watch('injectSharePrice') ?? null}
            onChange={(v) => form.setValue('injectSharePrice', toUndef(v), { shouldValidate: true })} />
            {form.formState.errors.injectSharePrice && <p className="text-sm text-destructive">{form.formState.errors.injectSharePrice.message}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="injectDeposit">추가 예수금</Label>
          <UnitInput id="injectDeposit" unit="USD" unitClassName="ml-2" maxDecimals={2} placeholder="0" disabled={disabled}
            value={form.watch('injectDeposit') ?? null}
            onChange={(v) => form.setValue('injectDeposit', v, { shouldValidate: true })} />
          {form.formState.errors.injectDeposit && <p className="text-sm text-destructive">{form.formState.errors.injectDeposit.message}</p>}
        </div>
      </section>
  )
}

export function WithdrawSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  return (
      <section className="space-y-4 rounded-[var(--r-sm)] border border-border p-4">
        <h2 className="text-sm font-bold text-foreground">투자금 인출 (선택)</h2>
        <p className="text-xs text-muted-foreground">보유 주식·예수금 중 일부를 전략에서 빼냅니다. 비워두면 인출하지 않습니다.</p>
        <div className="space-y-2">
          <Label htmlFor="withdrawShares">인출 주식 수</Label>
          <Input id="withdrawShares" type="text" inputMode="numeric" placeholder="0" disabled={disabled}
            onChange={(e) => form.setValue('withdrawShares', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="withdrawDeposit">인출 예수금</Label>
          <UnitInput id="withdrawDeposit" unit="USD" unitClassName="ml-2" maxDecimals={2} placeholder="0" disabled={disabled}
            value={form.watch('withdrawDeposit') ?? null}
            onChange={(v) => form.setValue('withdrawDeposit', v, { shouldValidate: true })} />
          {form.formState.errors.withdrawDeposit && <p className="text-sm text-destructive">{form.formState.errors.withdrawDeposit.message}</p>}
        </div>
      </section>
  )
}
