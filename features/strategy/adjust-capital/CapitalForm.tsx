'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useWatch } from 'react-hook-form'
import type { z } from 'zod'
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
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { UnitInput } from '@shared/ui/UnitInput'
import { currencyUnit, fmtMoney } from '@shared/lib/format'
import { CURRENCY_SCALE, type Currency } from '@shared/lib/api-schema'
import { orderKeys } from '@entities/order'
import { statsKeys } from '@entities/stats'
import { invalidateLedgerTotals } from '@entities/account'
import { tradeKeys } from '@entities/trade'
import { floorToCents, useInjectCapitalMutation, useWithdrawCapitalMutation } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import { injectCapitalFormSchema } from './model/injectCapitalFormSchema'
import { createWithdrawCapitalFormSchema } from './model/withdrawCapitalFormSchema'

export type CapitalKind = 'inject' | 'withdraw'

// 추가·인출의 차이는 요청 필드·문구·한도뿐이다. 요청 바디 필드 이름(depositAmount·amount)은 서버 계약 그대로
const KIND = {
  inject: {
    field: 'depositAmount',
    label: '추가 예수금',
    action: '추가',
    part: '추가분',
    confirmTitle: '투자금을 추가하시겠습니까?',
    confirmVerb: '진행 중인 사이클에 추가합니다',
    effect: { INFINITE: '1회 매수금이 커지고 회차가 앞당겨집니다.', other: '추가 금액에 맞춰 배수가 다시 계산됩니다.' },
  },
  withdraw: {
    field: 'amount',
    label: '인출 예수금',
    action: '인출',
    part: '인출분',
    confirmTitle: '투자금을 인출하시겠습니까?',
    confirmVerb: '진행 중인 사이클에서 인출합니다',
    effect: { INFINITE: '1회 매수금이 줄고 회차가 뒤로 밀립니다.', other: '인출 금액에 맞춰 배수가 다시 계산되고, 넘친 보유분은 매수를 줄여 맞춥니다.' },
  },
} as const

type Values = Record<string, number | null>

interface Props {
  kind: CapitalKind
  accountId: string
  strategy: Strategy
  currency: Currency // 계좌 통화 — 입력 단위·자릿수·금액 표기
  onDone: () => void // 취소·성공 뒤 — FormDialog의 close
}

export function CapitalForm({ kind, accountId, strategy, currency, onDone }: Props) {
  const c = KIND[kind]
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  // 다음 거래일 주문이 바뀌므로 주문 미리보기를 무효화 — 다른 도메인(order) 무효화이므로 feature가 소유한다.
  // hook 단계 onSuccess라 끝날 때까지 pending이 이어지고, 그 뒤 onDone으로 닫힌다
  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: orderKeys.preview(strategy.id) }).catch(() => null),
      // 잔고 이력(cycle-history)·성과에 추가·인출 결과가 바로 보이도록 함께 무효화한다
      queryClient.invalidateQueries({ queryKey: tradeKeys.all }).catch(() => null),
      // 전략 합산 예수금·평가금·미배정 예수금이 바로 반영되도록 함께 무효화한다
      invalidateLedgerTotals(queryClient, accountId),
      queryClient.invalidateQueries({ queryKey: statsKeys.all }).catch(() => null),
    ])
  }
  // 성공 토스트는 hook이 띄운다
  const inject = useInjectCapitalMutation(strategy.id, invalidate)
  const withdraw = useWithdrawCapitalMutation(strategy.id, invalidate)

  const schema = useMemo(
    () => (kind === 'inject' ? injectCapitalFormSchema : createWithdrawCapitalFormSchema(strategy.ledgerDeposit, currency)) as unknown as z.ZodType<Values, Values>,
    [kind, strategy.ledgerDeposit, currency],
  )
  const form = useAppForm({
    schema,
    defaultValues: { [c.field]: null },
    // 두 hook의 요청 타입이 달라 하나로 맞춘다 — 실제 바디는 toPayload가 KIND의 필드 이름으로 만든다
    mutation: (kind === 'inject' ? inject : withdraw) as unknown as typeof inject,
    toPayload: (v) => ({ [c.field]: v[c.field] as number }) as never,
    onDone,
  })
  const value = useWatch({ control: form.control, name: c.field })

  // DCA는 거래일 배치가 아니라 규칙 회차마다 주문한다 — 반영 시점을 회차로 쓰고, 예수금 외에 바뀌는 계산이 없어 효과 문구는 두지 않는다
  const isDca = strategy.type === 'DCA'
  const timing = isDca ? '다음 회차' : '다음 거래일 주문'
  const effectCaption = isDca ? '' : strategy.type === 'INFINITE' ? c.effect.INFINITE : c.effect.other

  return (
    // 검증을 통과했을 때만 확인 다이얼로그를 연다. 실패 시 handleSubmit이 오류 칸으로 포커스를 옮긴다
    <form onSubmit={form.handleSubmit(() => setConfirmOpen(true))} className="space-y-6">
      <div className="space-y-1 text-sm text-muted-foreground">
        {kind === 'withdraw' && strategy.ledgerDeposit != null && <p>현재 장부 예수금 {fmtMoney(floorToCents(strategy.ledgerDeposit), currency)}</p>}
        <p>{timing}부터 반영되고, 이번 사이클 수익률에서는 {c.part}이 빠집니다. {effectCaption}</p>
      </div>

      <FormField control={form.control} name={c.field} label={c.label}>
        {(f) => (
          <UnitInput id={f.id} unit={currencyUnit(currency)} unitClassName="ml-2" maxDecimals={CURRENCY_SCALE[currency]} placeholder="0" disabled={form.isPending}
            ref={f.ref} onBlur={f.onBlur}
            errorId={f['aria-invalid'] ? `${f.id}-error` : undefined}
            value={f.value ?? null}
            onChange={f.onChange} />
        )}
      </FormField>

      <FormActions form={form} onCancel={onDone} label={c.action} className="pt-2" />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{c.confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              예수금 {fmtMoney(value ?? 0, currency)}을(를) {c.confirmVerb}. {timing}부터 반영되며, 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={form.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => form.submit()} disabled={form.isPending}>
              {form.isPending ? `${c.action} 중…` : `${c.action} 확정`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
