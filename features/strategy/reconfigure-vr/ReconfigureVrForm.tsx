'use client'

import { useQueryClient } from '@tanstack/react-query'
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
import { FormActions } from '@shared/ui/FormActions'
import { orderKeys } from '@entities/order'
import { useReconfigureVrMutation } from '@entities/strategy'
import type { ReconfigureVrRequest } from '@entities/strategy'
import { reconfigureVrFormSchema, type ReconfigureVrFormValues } from './model/reconfigureVrFormSchema'
import type { ReconfigureVrStrategy } from './model/loadStrategyForReconfigure'
import type { DismissMode } from '@shared/lib/dismiss'
import { ParamsSection, RampSection, InjectSection, WithdrawSection } from './ReconfigureVrSections'

interface Props {
  accountId: string
  strategy: ReconfigureVrStrategy
  // 'push': 일반 페이지 라우트. 'back': 인터셉팅 라우트(모달)
  dismiss?: DismissMode
}

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
    withdrawShares: values.withdrawShares ?? undefined,
    withdrawDeposit: values.withdrawDeposit ?? undefined,
  }
}

export function ReconfigureVrForm({ accountId, strategy, dismiss = 'push' }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const vr = strategy.vr

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)
  // 사이클이 통째로 교체되므로 다음 주문 미리보기도 반드시 무효화 — 다른 도메인(order) 무효화이므로 feature가 소유한다
  const handleReconfigureSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: orderKeys.preview(strategy.id) }).catch(() => null)
    handleDone()
  }

  const [confirmOpen, setConfirmOpen] = useState(false)

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
      withdrawShares: null,
      withdrawDeposit: null,
    },
  })

  const mutation = useReconfigureVrMutation(strategy.id, handleReconfigureSuccess)
  const disabled = mutation.isPending

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

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex items-start gap-2.5 rounded-[var(--r-sm)] bg-warn-bg text-warn px-4 py-3 text-sm font-medium">
        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
        <p>설정을 하나라도 변경하면 진행 중인 사이클이 즉시 종료되고 새 사이클이 시작되며, 오늘 접수된 미체결 주문이 모두 취소됩니다.</p>
      </div>

      <ParamsSection form={form} vr={vr} disabled={disabled} />

      <RampSection form={form} vr={vr} disabled={disabled} />

      <InjectSection form={form} disabled={disabled} />

      <WithdrawSection form={form} disabled={disabled} />

      <FormActions
        onCancel={handleDone}
        isPending={disabled}
        canSubmit
        label="재설정"
        pendingLabel="재설정 중..."
        submitVariant="destructive"
        className="pt-2"
      />

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
