'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { Label } from '@/components/ui/label'
import { FormActions } from '@shared/ui/FormActions'
import { UnitInput } from '@shared/ui/UnitInput'
import { currencyUnit, fmtMoney } from '@shared/lib/format'
import { CURRENCY_SCALE, type Currency } from '@shared/lib/api-schema'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { accountKeys } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { floorToCents, useWithdrawCapitalMutation } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import type { DismissMode } from '@shared/lib/dismiss'
import { createWithdrawCapitalFormSchema, type WithdrawCapitalFormValues } from './model/withdrawCapitalFormSchema'

interface Props {
  accountId: string
  strategy: Strategy
  currency: Currency // 계좌 통화 — 입력 단위·자릿수·금액 표기
  // 'push': 일반 페이지 라우트. 'back': 인터셉팅 라우트(모달)
  dismiss?: DismissMode
}

export function WithdrawCapitalForm({ accountId, strategy, currency, dismiss = 'push' }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)

  // 다음 거래일 주문이 바뀌므로 주문 미리보기를 무효화 — 다른 도메인(order) 무효화이므로 feature가 소유한다
  const handleSuccess = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.preview(strategy.id) }).catch(() => null),
      // 잔고 이력(cycle-history)·성과에 추가·인출 결과가 바로 보이도록 함께 무효화한다
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
      // 전략 합산 예수금·평가금·미배정 예수금이 바로 반영되도록 함께 무효화한다
      queryClient.invalidateQueries({ queryKey: accountKeys.ledgerTotalsRoot() }).catch(() => null),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
    ])
    handleDone()
  }

  const schema = useMemo(() => createWithdrawCapitalFormSchema(strategy.ledgerDeposit, currency), [strategy.ledgerDeposit, currency])
  const form = useForm<WithdrawCapitalFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: null },
  })
  const { errors } = form.formState
  const amount = useWatch({ control: form.control, name: 'amount' })

  const mutation = useWithdrawCapitalMutation(strategy.id, handleSuccess)
  const disabled = mutation.isPending

  // 검증을 통과했을 때만 확인 다이얼로그를 연다. 실패 시 handleSubmit이 오류 칸으로 포커스를 옮긴다
  const onSubmit = form.handleSubmit(() => setConfirmOpen(true))

  // DCA는 거래일 배치가 아니라 규칙 회차마다 주문한다 — 반영 시점을 회차로 쓰고, 예수금 외에 바뀌는 계산이 없어 효과 문구는 두지 않는다
  const isDca = strategy.type === 'DCA'
  const timing = isDca ? '다음 회차' : '다음 거래일 주문'
  const effectCaption = isDca ? '' : strategy.type === 'INFINITE'
    ? '1회 매수금이 줄고 회차가 뒤로 밀립니다.'
    : '인출 금액에 맞춰 배수가 다시 계산되고, 넘친 보유분은 매수를 줄여 맞춥니다.'

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-1 text-sm text-muted-foreground">
        {strategy.ledgerDeposit != null && <p>현재 장부 예수금 {fmtMoney(floorToCents(strategy.ledgerDeposit), currency)}</p>}
        <p>{timing}부터 반영되고, 이번 사이클 수익률에서는 인출분이 빠집니다. {effectCaption}</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">인출 예수금</Label>
        <Controller control={form.control} name="amount" render={({ field }) => (
          <UnitInput id="amount" unit={currencyUnit(currency)} unitClassName="ml-2" maxDecimals={CURRENCY_SCALE[currency]} placeholder="0" disabled={disabled}
            ref={field.ref} onBlur={field.onBlur}
            errorId={errors.amount ? 'amount-error' : undefined}
            value={field.value ?? null}
            onChange={field.onChange} />
        )} />
        {errors.amount && <p id="amount-error" role="alert" className="text-sm text-destructive">{errors.amount.message}</p>}
      </div>

      <FormActions onCancel={handleDone} isPending={disabled} canSubmit label="인출" pendingLabel="인출 중..." className="pt-2" />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>투자금을 인출하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              예수금 {fmtMoney(amount ?? 0, currency)}을(를) 진행 중인 사이클에서 인출합니다. {timing}부터 반영되며, 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate({ amount: form.getValues('amount') as number })} disabled={disabled}>
              {mutation.isPending ? '인출 중...' : '인출 확정'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
