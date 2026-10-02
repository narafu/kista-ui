'use client'

import { useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectionCard } from '@shared/ui/selection-card'
import { cn } from '@shared/lib/utils'
import { ratioToPercent, percentToRatio } from '@shared/lib/format'
import { useDecimalAmountText } from '@shared/lib/hooks/use-decimal-amount-text'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { applyPStepWeeksChange } from '@entities/strategy'
import type { ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/loadStrategyForReconfigure'

interface SectionProps {
  form: UseFormReturn<ReconfigureVrFormValues>
  vr: ReconfigureVrStrategy['vr']
  disabled: boolean
}

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

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
          <Label htmlFor="bandWidth">밴드 폭 (%)</Label>
          <Input
            id="bandWidth"
            type="text"
            inputMode="decimal"
            defaultValue={vr.bandWidth}
            disabled={disabled}
            onChange={(e) => form.setValue('bandWidth', parseOptionalNumber(e.target.value), { shouldValidate: true })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="intervalWeeks">리밸런싱 주기 (주)</Label>
          <Input
            id="intervalWeeks"
            type="text"
            inputMode="numeric"
            defaultValue={vr.intervalWeeks}
            disabled={disabled}
            onChange={(e) => form.setValue('intervalWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })}
          />
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

export function RampSection({ form, vr, disabled }: SectionProps) {
  const pStepWeeks = form.watch('pStepWeeks')
  const pStepWeeksIsZero = pStepWeeks === 0
  // 단계주기 0→비영값 전환 시 하한/유예를 빈 값으로 리셋했음을 표시 — defaultValue를 매 렌더 watch 값에서 계산하면
  // Base UI FieldControl이 "uncontrolled 컴포넌트의 defaultValue가 초기화 후 바뀜" 경고를 띄우므로, key와 함께 전환 시점에만 갱신되는 값을 사용한다
  const [poolLimitFloorWasReset, setPoolLimitFloorWasReset] = useState(false)

  function handlePStepWeeksChange(raw: string) {
    const value = parseOptionalNumber(raw) ?? null
    const wasZero = form.getValues('pStepWeeks') === 0
    applyPStepWeeksChange(value, wasZero, {
      setPStepWeeks: (v) => form.setValue('pStepWeeks', v, { shouldValidate: true }),
      setPoolLimitFloor: (v) => form.setValue('poolLimitFloor', v, { shouldValidate: true }),
      setPGraceWeeks: (v) => form.setValue('pGraceWeeks', v, { shouldValidate: true }),
    })
    if (value !== 0 && wasZero) setPoolLimitFloorWasReset(true)
  }

  return (
      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">램프 설정</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="initialGradient">초기 gradient(G)</Label>
            <Input id="initialGradient" type="text" inputMode="numeric" defaultValue={vr.initialGradient} disabled={disabled}
              onChange={(e) => form.setValue('initialGradient', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gStepWeeks">gradient 단계주기(주)</Label>
            <Input id="gStepWeeks" type="text" inputMode="numeric" defaultValue={vr.gStepWeeks} disabled={disabled}
              onChange={(e) => form.setValue('gStepWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gMax">gradient 상한</Label>
            <Input id="gMax" type="text" inputMode="numeric" defaultValue={vr.gMax} disabled={disabled}
              onChange={(e) => form.setValue('gMax', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
            {form.formState.errors.gMax && <p className="text-sm text-destructive">{form.formState.errors.gMax.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="gGraceWeeks">gradient 유예(주)</Label>
            <Input id="gGraceWeeks" type="text" inputMode="numeric" defaultValue={vr.gGraceWeeks} disabled={disabled}
              onChange={(e) => form.setValue('gGraceWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="initialPoolLimitRate">초기 poolLimitRate (%)</Label>
            {/* poolLimitRate는 DB에 비율 소수 2자리(NUMERIC(6,2))로 저장 — %는 정수만 입력받아야 표시값과 저장값이 어긋나지 않는다 */}
            <Input id="initialPoolLimitRate" type="text" inputMode="numeric"
              defaultValue={ratioToPercent(vr.initialPoolLimitRate)}
              disabled={disabled}
              onChange={(e) => {
                if (!/^\d*$/.test(e.target.value)) return
                const percent = parseOptionalNumber(e.target.value)
                form.setValue('initialPoolLimitRate', percent !== undefined ? percentToRatio(percent) : undefined, { shouldValidate: true })
              }} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pStepWeeks">poolLimitRate 단계주기(주)</Label>
            <Input id="pStepWeeks" type="text" inputMode="numeric" defaultValue={vr.pStepWeeks} disabled={disabled}
              onChange={(e) => handlePStepWeeksChange(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="poolLimitFloor">poolLimitRate 하한 (%)</Label>
            <Input
              key={pStepWeeksIsZero ? 'poolLimitFloor-zero' : `poolLimitFloor-active-${poolLimitFloorWasReset}`}
              id="poolLimitFloor" type="text" inputMode="numeric"
              defaultValue={pStepWeeksIsZero ? 0 : (poolLimitFloorWasReset ? undefined : ratioToPercent(vr.poolLimitFloor))}
              disabled={disabled || pStepWeeksIsZero}
              onChange={(e) => {
                if (!/^\d*$/.test(e.target.value)) return
                const percent = parseOptionalNumber(e.target.value)
                form.setValue('poolLimitFloor', percent !== undefined ? percentToRatio(percent) : undefined, { shouldValidate: true })
              }} />
            {form.formState.errors.poolLimitFloor && <p className="text-sm text-destructive">{form.formState.errors.poolLimitFloor.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="pGraceWeeks">poolLimitRate 유예(주)</Label>
            <Input
              key={pStepWeeksIsZero ? 'pGraceWeeks-zero' : `pGraceWeeks-active-${poolLimitFloorWasReset}`}
              id="pGraceWeeks" type="text" inputMode="numeric"
              defaultValue={pStepWeeksIsZero ? 0 : (poolLimitFloorWasReset ? undefined : vr.pGraceWeeks)}
              disabled={disabled || pStepWeeksIsZero}
              onChange={(e) => form.setValue('pGraceWeeks', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
          </div>
        </div>
      </section>
  )
}

export function InjectSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  const injectShares = form.watch('injectShares')
  // allowNegative: true — 이 필드는 음수를 입력 자체에서 막지 않고 zod nonnegative() 검증까지
  // 그대로 넘겨 에러 메시지로 피드백한다(무피드백으로 조용히 '-'가 사라지는 것을 피하기 위함)
  const injectDeposit = useDecimalAmountText({
    value: form.watch('injectDeposit') ?? null,
    onChange: (v) => form.setValue('injectDeposit', v, { shouldValidate: true }),
    allowNegative: true,
  })

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
            <Label htmlFor="injectSharePrice">매수단가 (USD)</Label>
            <Input id="injectSharePrice" type="text" inputMode="decimal" disabled={disabled}
              onChange={(e) => form.setValue('injectSharePrice', parseOptionalNumber(e.target.value), { shouldValidate: true })} />
            {form.formState.errors.injectSharePrice && <p className="text-sm text-destructive">{form.formState.errors.injectSharePrice.message}</p>}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="injectDeposit">추가 예수금 (USD)</Label>
          <Input id="injectDeposit" type="text" inputMode="decimal" placeholder="0" disabled={disabled}
            value={injectDeposit.text}
            onChange={(e) => injectDeposit.handleChange(e.target.value)}
            onFocus={selectAllOnFocus} />
          {form.formState.errors.injectDeposit && <p className="text-sm text-destructive">{form.formState.errors.injectDeposit.message}</p>}
        </div>
      </section>
  )
}

export function WithdrawSection({ form, disabled }: Omit<SectionProps, 'vr'>) {
  const withdrawDeposit = useDecimalAmountText({
    value: form.watch('withdrawDeposit') ?? null,
    onChange: (v) => form.setValue('withdrawDeposit', v, { shouldValidate: true }),
    allowNegative: true,
  })

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
          <Label htmlFor="withdrawDeposit">인출 예수금 (USD)</Label>
          <Input id="withdrawDeposit" type="text" inputMode="decimal" placeholder="0" disabled={disabled}
            value={withdrawDeposit.text}
            onChange={(e) => withdrawDeposit.handleChange(e.target.value)}
            onFocus={selectAllOnFocus} />
          {form.formState.errors.withdrawDeposit && <p className="text-sm text-destructive">{form.formState.errors.withdrawDeposit.message}</p>}
        </div>
      </section>
  )
}
