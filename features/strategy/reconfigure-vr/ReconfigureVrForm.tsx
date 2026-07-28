'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SelectionCard } from '@shared/ui/selection-card'
import { cn } from '@shared/lib/utils'
import { useReconfigureVrMutation } from '@entities/strategy'
import type { ReconfigureVrRequest, Strategy } from '@entities/strategy'
import { reconfigureVrFormSchema, type ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'

interface Props {
  accountId: string
  strategy: Strategy
  // 'push': 일반 페이지 라우트. 'back': 인터셉팅 라우트(모달)
  dismiss?: 'push' | 'back'
}

type RecurringMode = 'DEPOSIT' | 'HOLD' | 'WITHDRAW'

function parseOptionalNumber(raw: string): number | undefined {
  if (raw.trim() === '') return undefined
  const n = Number(raw)
  return Number.isFinite(n) ? n : undefined
}

// 정수부(선택) + 소수점(선택) + 소수부 0~2자리
const AMOUNT_PATTERN = /^\d*\.?\d{0,2}$/

// ReconfigureVrFormValues는 zod 스키마상 각 필드가 number|null|undefined이지만
// ReconfigureVrRequest(API 요청 바디)는 number|undefined만 허용한다 — null을 undefined로 정규화한다.
function toReconfigureVrRequest(values: ReconfigureVrFormValues): ReconfigureVrRequest {
  return {
    bandWidth: values.bandWidth ?? undefined,
    intervalWeeks: values.intervalWeeks ?? undefined,
    recurringAmount: values.recurringAmount ?? undefined,
    initialGradient: values.initialGradient ?? undefined,
    gGraceWeeks: values.gGraceWeeks ?? undefined,
    gStepWeeks: values.gStepWeeks ?? undefined,
    gMax: values.gMax ?? undefined,
    initialPoolLimitRate: values.initialPoolLimitRate ?? undefined,
    pGraceWeeks: values.pGraceWeeks ?? undefined,
    pStepWeeks: values.pStepWeeks ?? undefined,
    poolLimitFloor: values.poolLimitFloor ?? undefined,
    injectShares: values.injectShares ?? undefined,
    injectSharePrice: values.injectSharePrice ?? undefined,
    injectDeposit: values.injectDeposit ?? undefined,
  }
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

export function ReconfigureVrForm({ accountId, strategy, dismiss = 'push' }: Props) {
  const router = useRouter()
  // loadAccountAndStrategyForReconfigure가 vr 없는 전략은 이미 걸러내 notFound() 처리하므로
  // 여기서 다시 null 체크하면 hooks(useState/useForm) 앞에 조건부 return이 생겨 Rules of Hooks를 위반한다.
  const vr = strategy.vr!

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)

  const [confirmOpen, setConfirmOpen] = useState(false)
  const [recurringMode, setRecurringMode] = useState<RecurringMode>(
    vr.recurringAmount > 0 ? 'DEPOSIT' : vr.recurringAmount < 0 ? 'WITHDRAW' : 'HOLD',
  )
  // "12." 같은 입력 중간 상태를 표현하기 위한 문자열 버퍼 — injectDeposit은 항상 null에서 시작하므로 외부 재동기화는 불필요
  const [injectDepositText, setInjectDepositText] = useState('')

  function handleInjectDepositChange(raw: string) {
    const sanitized = raw.replace(/[^\d.]/g, '')
    if (!AMOUNT_PATTERN.test(sanitized)) return
    setInjectDepositText(sanitized)
    form.setValue('injectDeposit', sanitized === '' || sanitized === '.' ? null : Number(sanitized), { shouldValidate: true })
  }

  const form = useForm<ReconfigureVrFormValues>({
    resolver: zodResolver(reconfigureVrFormSchema),
    defaultValues: {
      bandWidth: vr.bandWidth,
      intervalWeeks: vr.intervalWeeks,
      recurringAmount: vr.recurringAmount,
      initialGradient: vr.initialGradient,
      gGraceWeeks: vr.gGraceWeeks,
      gStepWeeks: vr.gStepWeeks,
      gMax: vr.gMax,
      initialPoolLimitRate: vr.initialPoolLimitRate,
      pGraceWeeks: vr.pGraceWeeks,
      pStepWeeks: vr.pStepWeeks,
      poolLimitFloor: vr.poolLimitFloor,
      injectShares: null,
      injectSharePrice: null,
      injectDeposit: null,
    },
  })

  const mutation = useReconfigureVrMutation(strategy.id, handleDone)
  const injectShares = form.watch('injectShares')
  const recurringAmountAbs = Math.abs(form.watch('recurringAmount') ?? 0)
  const pStepWeeks = form.watch('pStepWeeks')
  const pStepWeeksIsZero = pStepWeeks === 0
  // 단계주기 0→비영값 전환 시 하한/유예를 빈 값으로 리셋했음을 표시 — defaultValue를 매 렌더 watch 값에서 계산하면
  // Base UI FieldControl이 "uncontrolled 컴포넌트의 defaultValue가 초기화 후 바뀜" 경고를 띄우므로, key와 함께 전환 시점에만 갱신되는 값을 사용한다
  const [poolLimitFloorWasReset, setPoolLimitFloorWasReset] = useState(false)

  function handleRecurringModeChange(mode: RecurringMode) {
    setRecurringMode(mode)
    const abs = Math.abs(form.getValues('recurringAmount') ?? 0)
    form.setValue('recurringAmount', mode === 'WITHDRAW' ? -abs : mode === 'DEPOSIT' ? abs : 0, { shouldValidate: true })
  }

  function handleRecurringAmountChange(raw: string) {
    const magnitude = raw.trim() === '' ? 0 : Math.abs(Number(raw))
    form.setValue('recurringAmount', recurringMode === 'WITHDRAW' ? -magnitude : magnitude, { shouldValidate: true })
  }

  // poolLimitRate 단계주기=0은 램프 비활성화를 의미 — 하한/유예를 0으로 강제하고 비활성화, 0이 아니게 되돌리면 값을 비워 재입력받는다
  function handlePStepWeeksChange(raw: string) {
    const value = parseOptionalNumber(raw) ?? null
    const wasZero = form.getValues('pStepWeeks') === 0
    form.setValue('pStepWeeks', value, { shouldValidate: true })
    if (value === 0) {
      form.setValue('poolLimitFloor', 0, { shouldValidate: true })
      form.setValue('pGraceWeeks', 0, { shouldValidate: true })
    } else if (wasZero) {
      form.setValue('poolLimitFloor', null, { shouldValidate: true })
      form.setValue('pGraceWeeks', null, { shouldValidate: true })
      setPoolLimitFloorWasReset(true)
    }
  }

  // zodResolver는 항상 Promise를 반환하므로 form.handleSubmit()을 거치는 이상
  // 이 콜백은 비동기일 수밖에 없다. 대신 여기서 명시적으로 form.trigger()를 await해
  // reconfigureVrFormSchema의 superRefine 교차 검증(gMax>=initialGradient,
  // poolLimitFloor<=initialPoolLimitRate, injectShares>0이면 injectSharePrice 필수)을
  // 통과했을 때만 확인 다이얼로그를 연다 — 검증 실패 시 다이얼로그 자체가 뜨지 않는다.
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const valid = await form.trigger()
    if (valid) setConfirmOpen(true)
  }

  function handleConfirm() {
    mutation.mutate(toReconfigureVrRequest(form.getValues()))
  }

  const disabled = mutation.isPending

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-[var(--r-sm)] bg-warn-bg text-warn px-4 py-3 text-sm font-medium">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>설정을 하나라도 변경하면 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며, 오늘 접수된 미체결 주문이 모두 취소됩니다.</p>
      </div>

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
            <Input id="initialPoolLimitRate" type="text" inputMode="decimal"
              defaultValue={Math.round(vr.initialPoolLimitRate * 10000) / 100}
              disabled={disabled}
              onChange={(e) => {
                const percent = parseOptionalNumber(e.target.value)
                form.setValue('initialPoolLimitRate', percent !== undefined ? Math.round(percent * 100) / 10000 : undefined, { shouldValidate: true })
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
              id="poolLimitFloor" type="text" inputMode="decimal"
              defaultValue={pStepWeeksIsZero ? 0 : (poolLimitFloorWasReset ? undefined : Math.round(vr.poolLimitFloor * 10000) / 100)}
              disabled={disabled || pStepWeeksIsZero}
              onChange={(e) => {
                const percent = parseOptionalNumber(e.target.value)
                form.setValue('poolLimitFloor', percent !== undefined ? Math.round(percent * 100) / 10000 : undefined, { shouldValidate: true })
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
            value={injectDepositText}
            onChange={(e) => handleInjectDepositChange(e.target.value)} />
        </div>
      </section>

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" className="flex-1 h-12" onClick={handleDone} disabled={disabled}>
          취소
        </Button>
        <Button type="submit" variant="destructive" className="flex-1 h-12" disabled={disabled}>
          재설정
        </Button>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>VR 전략을 재설정하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              진행 중인 사이클이 즉시 종료되고 새 사이클이 시작됩니다. 오늘 접수된 미체결 주문은 모두 취소됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={disabled}>
              {mutation.isPending ? '재설정 중...' : '재설정 확정'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
