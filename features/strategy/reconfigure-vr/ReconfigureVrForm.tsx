'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { FormActions } from '@shared/ui/FormActions'
import { apiFieldMsg } from '@shared/lib/api-client'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { invalidateLedgerTotals } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { StrategyValidationWarnings, useReconfigureVrMutation, useStrategyValidationQuery } from '@entities/strategy'
import type { ReconfigureVrRequest } from '@entities/strategy'
import { createReconfigureVrFormSchema, type ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/reconfigureVrStrategy'
import { ParamsSection, RampSection, InjectSection, WithdrawSection, initialRecurringMode } from './ReconfigureVrSections'

interface Props {
  accountId: string
  strategy: ReconfigureVrStrategy
}

// ReconfigureVrFormValues는 zod 스키마상 각 필드가 number|null|undefined이지만
// ReconfigureVrRequest(API 요청 바디)는 number|undefined만 허용한다 — null을 undefined로 정규화한다.
function toReconfigureVrRequest(values: ReconfigureVrFormValues): ReconfigureVrRequest {
  return {
    bandWidth: values.bandWidth ?? undefined,
    intervalWeeks: values.intervalWeeks ?? undefined,
    // 거치 모드에서 비운 칸(null)은 0 — undefined면 서버가 현재 값을 이어받는다. 적립·인출의 빈 칸은 스키마가 막는다
    recurringAmount: values.recurringAmount ?? 0,
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
    withdrawShares: values.withdrawShares ?? undefined,
    withdrawDeposit: values.withdrawDeposit ?? undefined,
  }
}

export function ReconfigureVrForm({ accountId, strategy }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const vr = strategy.vr

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = () => router.push(backHref)
  // 사이클 교체와 미체결 취소로 주문 미리보기·내역이 모두 낡는다 — 다른 도메인(order) 무효화이므로 feature가 소유한다
  const handleReconfigureSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.all }).catch(() => null),
      // 잔고 이력(cycle-history)·성과에 추가·인출 결과가 바로 보이도록 함께 무효화한다
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
      invalidateLedgerTotals(queryClient, accountId),
    ])
    handleDone()
  }

  const [confirmOpen, setConfirmOpen] = useState(false)

  function focusFirstInvalid(formEl: HTMLFormElement, framesLeft = 5) {
    requestAnimationFrame(() => {
      const invalid = formEl.querySelector<HTMLElement>('[aria-invalid="true"]')
      if (invalid) invalid.focus()
      else if (framesLeft > 0) focusFirstInvalid(formEl, framesLeft - 1)
    })
  }

  const schema = useMemo(
    () => createReconfigureVrFormSchema({
      initialGradient: vr.initialGradient,
      gStepWeeks: vr.gStepWeeks,
      gMax: vr.gMax,
      initialPoolLimitRate: vr.initialPoolLimitRate,
      pStepWeeks: vr.pStepWeeks,
      poolLimitFloor: vr.poolLimitFloor,
    }, strategy.ledgerDeposit),
    [vr.initialGradient, vr.gStepWeeks, vr.gMax, vr.initialPoolLimitRate, vr.pStepWeeks, vr.poolLimitFloor, strategy.ledgerDeposit],
  )

  const form = useForm<ReconfigureVrFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      bandWidth: vr.bandWidth,
      intervalWeeks: vr.intervalWeeks,
      recurringAmount: vr.recurringAmount,
      recurringMode: initialRecurringMode(vr.recurringAmount),
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
      withdrawShares: null,
      withdrawDeposit: null,
    },
  })

  const mutation = useReconfigureVrMutation(strategy.id, handleReconfigureSuccess)
  const disabled = mutation.isPending

  // 서버 검증 — 바디는 제출 바디 그대로. 거절은 지금 입력의 결과만 막고, 검증 중·실패면 막지 않는다(제출에서 서버가 다시 거른다)
  const validation = useStrategyValidationQuery(
    { kind: 'vr-config', strategyId: strategy.id },
    toReconfigureVrRequest(form.watch()),
    { enabled: true },
  )
  // 제출 400의 필드 문장 — 표시 전용(제출 차단에 넣지 않는다), 지금 입력의 검증 결과가 오면 숨기고 다음 제출이 지운다
  const submitError = validation.current ? null : apiFieldMsg(mutation.error)
  // 같은 칸에 화면 검증 오류가 있으면 서버의 같은 지적은 겹쳐 보이지 않게 숨긴다
  const rejected = validation.current?.fieldErrors[0]
  const serverError = rejected?.field && rejected.field in form.formState.errors ? undefined : rejected
  const serverErrorRef = useRef<HTMLParagraphElement>(null)

  // zodResolver는 항상 Promise를 반환하므로 form.handleSubmit()을 거치는 이상
  // 이 콜백은 비동기일 수밖에 없다. 대신 여기서 명시적으로 form.trigger()를 await해
  // createReconfigureVrFormSchema의 superRefine 교차 검증(gMax>=initialGradient,
  // poolLimitFloor<=initialPoolLimitRate, 적립·인출 금액>0, injectShares>0이면 injectSharePrice 필수, 인출 예수금<=장부 예수금)을
  // 통과했을 때만 확인 다이얼로그를 연다 — 검증 실패 시 다이얼로그 자체가 뜨지 않는다.
  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formEl = e.currentTarget
    const valid = await form.trigger()
    // 오류 칸의 aria-invalid는 렌더 뒤에 붙는다 — 다음 프레임에 첫 칸을 찾는다
    // 부하로 첫 프레임이 렌더 커밋보다 빠를 수 있어 몇 프레임 더 찾는다
    if (!valid) focusFirstInvalid(formEl)
    else if (serverError) serverErrorRef.current?.focus()
    else setConfirmOpen(true)
  }

  function handleConfirm() {
    mutation.mutate(toReconfigureVrRequest(form.getValues()))
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-sm bg-warn-bg text-warn px-4 py-3 text-sm font-medium">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>설정을 하나라도 변경하면 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며, 오늘 접수된 미체결 주문이 모두 취소됩니다.</p>
      </div>

      <ParamsSection form={form} vr={vr} disabled={disabled} />

      <RampSection form={form} vr={vr} disabled={disabled} />

      <InjectSection form={form} disabled={disabled} />

      <WithdrawSection form={form} disabled={disabled} ledgerDeposit={strategy.ledgerDeposit} />

      <div aria-live="polite">{serverError && <p ref={serverErrorRef} tabIndex={-1} className="text-sm font-semibold text-warn">{serverError.detail}</p>}</div>
      <StrategyValidationWarnings warnings={validation.current?.warnings ?? []} unavailable={validation.isError} />

      {submitError && <p role="alert" className="text-sm font-semibold text-status-error">{submitError}</p>}
      <FormActions
        onCancel={handleDone}
        isPending={disabled}
        label="재설정"
        submitVariant="destructive"
        className="pt-2"
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="VR 전략을 재설정하시겠습니까?"
        description="진행 중인 사이클이 즉시 종료되고 새 사이클이 시작됩니다. 오늘 접수된 미체결 주문은 모두 취소됩니다. 이 작업은 되돌릴 수 없습니다."
        confirmLabel="재설정 확정"
        pendingLabel="재설정 중…"
        onConfirm={handleConfirm}
        pending={disabled}
      />
    </form>
  )
}
