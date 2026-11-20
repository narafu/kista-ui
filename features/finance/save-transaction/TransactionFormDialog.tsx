'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { FormDialog } from '@shared/ui/FormDialog'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { InputWithUnit } from '@shared/ui/InputUnitSuffix'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { MonthClosedNotice } from '@shared/ui/MonthClosedNotice'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import {
  useMonthlyClosingScopeGroupId,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateFinanceTransactionMutation,
  useFinanceCategoriesQuery,
  useMonthlyClosingsQuery,
  useUpdateFinanceTransactionMutation,
} from '@entities/finance'
import type { FinanceCategoryType, FinanceTransaction, FinanceTransactionRequest } from '@entities/finance'
import { initialTransactionDate, isDateInWindow, isTransactionLocked } from './transactionFormHelpers'

// 금액은 입력 중 콤마 표시를 위해 숫자 문자열로 들고 있다가 제출 때 Number로 바꾼다
const schema = z.object({
  transactionDate: z.string().min(1, '날짜를 선택하세요.'),
  // 카테고리는 RHF 밖 계단식 상태(useCategoryPathState)를 미러링한다 — 빈 값을 제출 시 필드 오류로 보이려는 용도이며 요청 바디는 path 상태에서 만든다
  categoryId: z.string().min(1, '카테고리를 선택하세요.'),
  amount: z.string().min(1, '금액을 입력하세요.'),
  memo: z.string(),
  shareToGroup: z.boolean(),
})

interface Props {
  open: boolean
  onClose: () => void
  type: FinanceCategoryType
  initial?: FinanceTransaction
  // 내역 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·메모·
  // 날짜(원본 날짜, windowFrom/windowTo로 clamp)를 프리필한다.
  duplicateFrom?: Pick<FinanceTransaction, 'categoryId' | 'amount' | 'memo' | 'transactionDate'>
  // 등록(NewTransactionButton)·복제 시 새로 저장될 날짜의 유효 범위('YYYY-MM-DD') — "오늘 기준"
  // 독립 창(useFinanceFlowData.ts/FinanceHeader.tsx의 registerWindow, 하한 없음·상한은 이번 달 말일).
  // 수정(FinanceRecordList)은 자산 기록 수정과 동일하게 날짜 제약이 없어 이 prop을 넘기지 않는다
  // — 과거에는 조회 중인 12개월 창으로 clamp했으나, 등록 시점을 잘못 고른 내역을 그 창 밖 날짜로
  // 옮기지 못하는 문제가 있어 수정만 무제한으로 풀었다.
  windowFrom?: string
  windowTo?: string
}

export function TransactionFormDialog({ open, onClose, ...formProps }: Props) {
  return (
    <FormDialog open={open} onClose={onClose} title={formProps.initial ? '거래내역 수정' : '거래내역 등록'} description="날짜, 카테고리, 금액을 입력하세요.">
      {(close) => <TransactionForm {...formProps} onDone={close} />}
    </FormDialog>
  )
}

function TransactionForm({ type, initial, duplicateFrom, windowFrom, windowTo, onDone }: Omit<Props, 'open' | 'onClose'> & { onDone: () => void }) {
  const mode = initial ? 'edit' : 'create'
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const seed = initial ?? duplicateFrom
  // 카테고리 계단식 선택은 RHF 밖 상태다 — 제출 때 toPayload가 현재 categoryId를 읽는다
  const { selectedPath, setSelectedPath, cascadeLevels, categoryId } = useCategoryPathState(categories, seed?.categoryId)

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const createMutation = useCreateFinanceTransactionMutation()
  const updateMutation = useUpdateFinanceTransactionMutation(initial?.id ?? '')

  const form = useAppForm({
    schema,
    defaultValues: {
      transactionDate: initialTransactionDate(initial, duplicateFrom, todayKst(), windowFrom, windowTo),
      categoryId,
      amount: seed ? String(seed.amount) : '',
      memo: seed?.memo ?? '',
      shareToGroup: true,
    },
    mutation: mode === 'edit' ? updateMutation : createMutation,
    toPayload: (v) => {
      const payload: FinanceTransactionRequest = {
        categoryId,
        transactionDate: v.transactionDate,
        amount: Number(v.amount),
        memo: v.memo.trim() || undefined,
      }
      return mode === 'edit' ? payload : { ...payload, shareToGroup: canShareToGroup && v.shareToGroup }
    },
    successMessage: mode === 'edit' ? '거래내역이 수정되었습니다' : '거래내역이 등록되었습니다',
    onDone,
  })

  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const closingScopeGroupId = useMonthlyClosingScopeGroupId()
  const transactionDate = form.watch('transactionDate')
  const monthClosed = isTransactionLocked(monthlyClosings, closingScopeGroupId, transactionDate, initial)

  const dateOutOfWindow = transactionDate !== '' && !isDateInWindow(transactionDate, windowFrom, windowTo)
  // 잠금 — 월 마감·기간 밖 날짜는 무엇을 입력해도 제출할 수 없다(이유는 아래 안내·날짜 hint). 빈 값은 zod가 제출 시 알린다
  const locked = monthClosed || dateOutOfWindow

  // 계단식 선택(RHF 밖 상태)을 폼 필드로 미러링 — 선택 후 오류가 있던 필드는 바로 갱신한다
  const { setValue } = form
  const isSubmitted = form.formState.isSubmitted
  useEffect(() => { setValue('categoryId', categoryId, { shouldValidate: isSubmitted }) }, [setValue, categoryId, isSubmitted])

  return (
    <form onSubmit={(e) => (locked ? e.preventDefault() : form.submit(e))} className="space-y-4">
      {/* 직접 입력하면 min/max가 걸러주지 못해 저장이 잠긴다 — 이유를 알린다 */}
      <FormField
        control={form.control}
        name="transactionDate"
        label="날짜"
        required
        hint={dateOutOfWindow && (
          <span className="text-destructive">
            {windowFrom && windowTo ? `${windowFrom} ~ ${windowTo} 사이 날짜만` : windowTo ? `${windowTo}까지만` : `${windowFrom}부터만`} 등록할 수 있습니다.
          </span>
        )}
      >
        {(f) => <Input {...f} type="date" min={windowFrom} max={windowTo} disabled={form.isPending} aria-invalid={f['aria-invalid'] || dateOutOfWindow || undefined} className="h-11" />}
      </FormField>

      <FormField control={form.control} name="categoryId" label="카테고리" required id="category">
        {(f) => (
          <CascadingCategorySelect
            levels={cascadeLevels}
            path={selectedPath}
            onPathChange={setSelectedPath}
            allowClear={false}
            id={f.id}
            triggerRef={f.ref}
            aria-invalid={f['aria-invalid']}
            aria-describedby={f['aria-describedby']}
            aria-required={f['aria-required']}
            className="w-full h-11"
            disabled={form.isPending}
          />
        )}
      </FormField>

      <FormField control={form.control} name="amount" label="금액" required>
        {(f) => (
          <InputWithUnit unit="원" unitId="amountUnit">
            <Input
              {...f}
              aria-describedby={[f['aria-describedby'], 'amountUnit'].filter(Boolean).join(' ')}
              inputMode="numeric"
              placeholder="0"
              value={formatAmountDisplay(f.value)}
              onChange={(e) => f.onChange(digitsOnly(e.target.value))}
              onFocus={selectAllOnFocus}
              disabled={form.isPending}
              className="h-11 pr-8 text-right tabular-nums"
            />
          </InputWithUnit>
        )}
      </FormField>

      <FormField control={form.control} name="memo" label="메모">
        {(f) => <Input {...f} disabled={form.isPending} maxLength={255} className="h-11" />}
      </FormField>

      {mode === 'create' && canShareToGroup && (
        <ShareToGroupSwitch id="transactionShareToGroup" checked={form.watch('shareToGroup')} onCheckedChange={(v) => form.setValue('shareToGroup', v)} disabled={form.isPending} />
      )}

      {monthClosed && <MonthClosedNotice />}

      <FormActions form={form} onCancel={onDone} locked={locked} label={mode === 'edit' ? '수정' : '등록'} className="pt-2" />
    </form>
  )
}
