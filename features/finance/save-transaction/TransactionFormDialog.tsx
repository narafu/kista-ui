'use client'

import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  transactionDate: z.string().min(1),
  amount: z.string().min(1),
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

  const dateInWindow = isDateInWindow(transactionDate, windowFrom, windowTo)
  const dateOutOfWindow = transactionDate !== '' && !dateInWindow
  const canSubmit = transactionDate !== '' && dateInWindow && categoryId !== '' && form.watch('amount') !== '' && !monthClosed

  return (
    <form onSubmit={(e) => (canSubmit ? form.submit(e) : e.preventDefault())} className="space-y-4">
      {/* 직접 입력하면 min/max가 걸러주지 못해 저장 버튼만 비활성이 된다 — 이유를 알린다 */}
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

      <div className="space-y-2">
        <Label htmlFor="category">카테고리</Label>
        <CascadingCategorySelect
          levels={cascadeLevels}
          path={selectedPath}
          onPathChange={setSelectedPath}
          allowClear={false}
          id="category"
          className="w-full h-11"
          disabled={form.isPending}
        />
      </div>

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

      <FormActions form={form} onCancel={onDone} canSubmit={canSubmit} label={mode === 'edit' ? '수정' : '등록'} className="pt-2" />
    </form>
  )
}
