'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectionCard } from '@shared/ui/selection-card'
import { cn } from '@shared/lib/utils'
import { UnitInput } from '@shared/ui/UnitInput'
import { VrRampFields, type VrRampValues } from '@entities/strategy'
import type { ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/loadStrategyForReconfigure'

interface SectionProps {
  form: UseFormReturn<ReconfigureVrFormValues>
  vr: ReconfigureVrStrategy['vr']
  disabled: boolean
}

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

const toUndef = (v: number | null) => v ?? undefined

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

function ModeButton({
  children,
  selected,
  disabled,
  onClick,
}: {
  children: React.ReactNode
  selected: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <SelectionCard
      selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn('h-11 px-3 text-center text-sm font-extrabold', !selected && 'text-muted-foreground')}
    >
      {children}
    </SelectionCard>
  )
}

function initialRecurringMode(recurringAmount: number): RecurringMode {
  if (recurringAmount > 0) return 'DEPOSIT'
  return recurringAmount < 0 ? 'WITHDRAW' : 'HOLD'
}

export function ParamsSection({ form, vr, disabled }: SectionProps) {
  const [recurringMode, setRecurringMode] = useState<RecurringMode>(() => initialRecurringMode(vr.recurringAmount))
  const recurringAmountAbs = Math.abs(form.watch('recurringAmount') ?? 0)

  function handleRecurringModeChange(mode: RecurringMode) {
    setRecurringMode(mode)
    const abs = Math.abs(form.getValues('recurringAmount') ?? 0)
    form.setValue('recurringAmount', mode === 'WITHDRAW' ? -abs : mode === 'DEPOSIT' ? abs : 0, { shouldValidate: true })
  }

  function handleRecurringAmountChange(raw: string) {
    const magnitude = raw.trim() === '' ? 0 : Math.abs(Number(raw))
    form.setValue('recurringAmount', recurringMode === 'WITHDRAW' ? -magnitude : magnitude, { shouldValidate: true })
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
        <div className="space-y-2">
          <Label>적립금(+)/인출금(-)</Label>
          <div className="grid grid-cols-3 gap-2">
            <ModeButton selected={recurringMode === 'DEPOSIT'} disabled={disabled} onClick={() => handleRecurringModeChange('DEPOSIT')}>+ 적립</ModeButton>
            <ModeButton selected={recurringMode === 'HOLD'} disabled={disabled} onClick={() => handleRecurringModeChange('HOLD')}>거치</ModeButton>
            <ModeButton selected={recurringMode === 'WITHDRAW'} disabled={disabled} onClick={() => handleRecurringModeChange('WITHDRAW')}>- 인출</ModeButton>
          </div>
          <Input
            key={recurringMode}
            type="text"
            inputMode="decimal"
            aria-label="적립금(+)/인출금(-)"
            disabled={disabled || recurringMode === 'HOLD'}
            defaultValue={recurringAmountAbs || ''}
            onChange={(e) => handleRecurringAmountChange(e.target.value)}
          />
        </div>
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
        <h2 className="text-sm font-bold text-foreground">자본 주입 (선택)</h2>
        <p className="text-xs text-muted-foreground">설정 변경과 별개로 보유 주식·예수금을 추가로 편입합니다. 비워두면 주입하지 않습니다.</p>
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
        <h2 className="text-sm font-bold text-foreground">자본 인출 (선택)</h2>
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
