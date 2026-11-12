'use client'

import { FormDialog } from '@shared/ui/FormDialog'
import type { FinanceBudget, FlowType } from '@entities/finance'
import { BudgetForm } from './BudgetForm'

const FORM_COPY = {
  create: { title: '예산 추가', description: '카테고리·적용 기간·월 예산을 입력합니다.' },
  duplicate: { title: '예산 복제', description: '원본과 적용 기간이 겹치면 저장되지 않습니다. 적용 기간을 변경하세요.' },
  edit: { title: '예산 수정', description: '카테고리·적용 기간·월 예산을 입력합니다.' },
} as const

// 추가·복제·수정 공용 예산 폼 대화상자. 복제·수정은 원본 budget을 함께 넘긴다
export type BudgetFormTarget = { mode: 'create' } | { mode: 'duplicate'; budget: FinanceBudget } | { mode: 'edit'; budget: FinanceBudget }

interface Props {
  type: FlowType
  target: BudgetFormTarget
  open: boolean
  onClose: () => void
  defaultCategoryId?: string
}

export function BudgetFormDialog({ type, target, open, onClose, defaultCategoryId }: Props) {
  return (
    <FormDialog open={open} onClose={onClose} title={FORM_COPY[target.mode].title} description={FORM_COPY[target.mode].description}>
      {(close) => (
        <BudgetForm
          type={type}
          initial={target.mode === 'edit' ? target.budget : undefined}
          duplicateFrom={target.mode === 'duplicate' ? target.budget : undefined}
          defaultCategoryId={defaultCategoryId}
          onDone={close}
        />
      )}
    </FormDialog>
  )
}
