'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectionCard } from '@shared/ui/selection-card'
import { cn } from '@shared/lib/utils'
import { ratioToPercent, percentToRatio } from '@shared/lib/format'
import { UnitInput } from '@shared/ui/UnitInput'
import { applyPStepWeeksChange } from '@entities/strategy'
import type { ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/loadStrategyForReconfigure'

interface SectionProps {
  form: UseFormReturn<ReconfigureVrFormValues>
  vr: ReconfigureVrStrategy['vr']
  disabled: boolean
}

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

const toUndef = (v: number | null) => v ?? undefined
const toPercentOrNull = (ratio: number | null | undefined) => (ratio == null ? null : ratioToPercent(ratio))
const toRatioOrUndef = (percent: number | null) => (percent === null ? undefined : percentToRatio(percent))

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

export function RampSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  const pStepWeeksIsZero = form.watch('pStepWeeks') === 0

  // 단계주기 0이면 하한/유예는 0 표시+비활성, 0→비영값 전환 시 applyPStepWeeksChange가 null로 리셋해 빈 칸이 된다(form 값이 SSOT)
  function handlePStepWeeksChange(value: number | null) {
    const wasZero = form.getValues('pStepWeeks') === 0
    applyPStepWeeksChange(value, wasZero, {
      setPStepWeeks: (v) => form.setValue('pStepWeeks', v, { shouldValidate: true }),
      setPoolLimitFloor: (v) => form.setValue('poolLimitFloor', v, { shouldValidate: true }),
      setPGraceWeeks: (v) => form.setValue('pGraceWeeks', v, { shouldValidate: true }),
    })
  }

  const num = (name: 'initialGradient' | 'gStepWeeks' | 'gMax' | 'gGraceWeeks' | 'pGraceWeeks') => ({
    value: form.watch(name) ?? null,
    onChange: (v: number | null) => form.setValue(name, toUndef(v), { shouldValidate: true }),
  })

  return (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">램프 설정</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialGradient">초기 gradient(G)</Label>
            <UnitInput id="initialGradient" maxDecimals={0} unit="" disabled={disabled} {...num('initialGradient')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gStepWeeks">gradient 단계주기</Label>
            <UnitInput id="gStepWeeks" maxDecimals={0} unit="주" disabled={disabled} {...num('gStepWeeks')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gMax">gradient 상한</Label>
            <UnitInput id="gMax" maxDecimals={0} unit="" disabled={disabled} {...num('gMax')} />
            {form.formState.errors.gMax && <p className="text-sm text-destructive">{form.formState.errors.gMax.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gGraceWeeks">gradient 유예</Label>
            <UnitInput id="gGraceWeeks" maxDecimals={0} unit="주" disabled={disabled} {...num('gGraceWeeks')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialPoolLimitRate">초기 poolLimitRate</Label>
            {/* poolLimitRate는 DB에 비율 소수 2자리(NUMERIC(6,2))로 저장 — %는 정수만 입력받아야 표시값과 저장값이 어긋나지 않는다 */}
            <UnitInput id="initialPoolLimitRate" unit="%" maxDecimals={0} disabled={disabled}
              value={toPercentOrNull(form.watch('initialPoolLimitRate'))}
              onChange={(v) => form.setValue('initialPoolLimitRate', toRatioOrUndef(v), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pStepWeeks">poolLimitRate 단계주기</Label>
            <UnitInput id="pStepWeeks" maxDecimals={0} unit="주" disabled={disabled}
              value={form.watch('pStepWeeks') ?? null} onChange={handlePStepWeeksChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poolLimitFloor">poolLimitRate 하한</Label>
            <UnitInput id="poolLimitFloor" unit="%" maxDecimals={0} disabled={disabled || pStepWeeksIsZero}
              value={toPercentOrNull(form.watch('poolLimitFloor'))}
              onChange={(v) => form.setValue('poolLimitFloor', toRatioOrUndef(v), { shouldValidate: true })} />
            {form.formState.errors.poolLimitFloor && <p className="text-sm text-destructive">{form.formState.errors.poolLimitFloor.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pGraceWeeks">poolLimitRate 유예</Label>
            <UnitInput id="pGraceWeeks" maxDecimals={0} unit="주" disabled={disabled || pStepWeeksIsZero} {...num('pGraceWeeks')} />
          </div>
        </div>
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
