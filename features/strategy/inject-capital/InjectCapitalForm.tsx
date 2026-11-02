'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
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
import { fmtUsd } from '@shared/lib/format'
import { orderKeys } from '@entities/order'
import { useInjectCapitalMutation } from '@entities/strategy'
import type { CapitalInjectionRequest, Strategy } from '@entities/strategy'
import type { DismissMode } from '@shared/lib/dismiss'
import { injectCapitalFormSchema, type InjectCapitalFormValues } from './model/injectCapitalFormSchema'

interface Props {
  accountId: string
  strategy: Strategy
  // 'push': 일반 페이지 라우트. 'back': 인터셉팅 라우트(모달)
  dismiss?: DismissMode
}

// 폼 값은 number|null|undefined, 요청 바디는 number|undefined — null을 undefined로 정규화한다
function toRequest(values: InjectCapitalFormValues): CapitalInjectionRequest {
  return {
    depositAmount: values.depositAmount ?? undefined,
    shares: values.shares ?? undefined,
    sharePrice: values.sharePrice ?? undefined,
  }
}

type FieldName = keyof InjectCapitalFormValues
// 포커스 이동 순서(등록 순서)와 교차 재검증 대상
const FIELD_NAMES: FieldName[] = ['depositAmount', 'shares', 'sharePrice']

export function InjectCapitalForm({ accountId, strategy, dismiss = 'push' }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [confirmOpen, setConfirmOpen] = useState(false)

  const backHref = `/accounts/${accountId}/strategies/${strategy.id}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)
  // 다음 거래일 주문이 바뀌므로 주문 미리보기를 무효화 — 다른 도메인(order) 무효화이므로 feature가 소유한다
  const handleSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: orderKeys.preview(strategy.id) }).catch(() => null)
    handleDone()
  }

  const form = useForm<InjectCapitalFormValues>({
    resolver: zodResolver(injectCapitalFormSchema),
    defaultValues: { depositAmount: null, shares: null, sharePrice: null },
  })
  const { errors, isSubmitted } = form.formState
  const { depositAmount, shares, sharePrice } = useWatch({ control: form.control })

  const mutation = useInjectCapitalMutation(strategy.id, handleSuccess)
  const disabled = mutation.isPending

  // 검증을 통과했을 때만 확인 다이얼로그를 연다. 실패 시 handleSubmit이 첫 오류 칸(등록 순서)으로 포커스를 옮긴다
  const onSubmit = form.handleSubmit(() => setConfirmOpen(true))

  // 칸 사이 교차 검증(셋 중 하나 필요, 수량·단가 쌍)이라 제출을 시도한 뒤에는 세 칸을 함께 재검증해 낡은 오류를 지운다
  const renderInput = (name: FieldName, label: string, unit: string, maxDecimals: number) => (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller control={form.control} name={name} render={({ field }) => (
        <UnitInput id={name} unit={unit} unitClassName="ml-2" maxDecimals={maxDecimals} placeholder="0" disabled={disabled}
          ref={field.ref} onBlur={field.onBlur}
          errorId={errors[name] ? `${name}-error` : undefined}
          value={field.value ?? null}
          onChange={(v) => {
            field.onChange(v)
            if (isSubmitted) void form.trigger(FIELD_NAMES)
          }} />
      )} />
      {errors[name] && <p id={`${name}-error`} role="alert" className="text-sm text-destructive">{errors[name].message}</p>}
    </div>
  )

  const summary = [
    depositAmount ? `예수금 $${fmtUsd(depositAmount)}` : null,
    shares && sharePrice ? `${strategy.ticker} ${shares.toLocaleString('en-US')}주(매수단가 $${fmtUsd(sharePrice)})` : null,
  ].filter(Boolean).join(', ')

  const effectCaption = strategy.type === 'INFINITE'
    ? '1회 매수금이 커지고 회차가 앞당겨집니다.'
    : '추가 금액에 맞춰 배수가 다시 계산됩니다.'

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        다음 거래일 주문부터 반영되고, 이번 사이클 수익률에서는 추가분이 빠집니다. {effectCaption}
      </p>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">예수금 추가</h2>
        {renderInput('depositAmount', '추가 예수금', 'USD', 2)}
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold text-foreground">주식 편입</h2>
        {renderInput('shares', '편입 주식 수', '주', 0)}
        {renderInput('sharePrice', '매수단가', 'USD', 2)}
      </section>

      <FormActions onCancel={handleDone} isPending={disabled} canSubmit label="추가" pendingLabel="추가 중..." className="pt-2" />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>투자금을 추가하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {summary}을(를) 진행 중인 사이클에 추가합니다. 다음 거래일 주문부터 반영되며, 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={disabled}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate(toRequest(form.getValues()))} disabled={disabled}>
              {mutation.isPending ? '추가 중...' : '추가 확정'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
