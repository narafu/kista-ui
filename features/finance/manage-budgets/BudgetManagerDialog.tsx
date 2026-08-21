'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { BudgetManager } from './BudgetManager'

interface Props {
  type: 'INCOME' | 'EXPENSE' | 'SAVING'
  className?: string
}

// NewTransactionButton(내역 등록)과 나란히 배치되는 보조 액션이라 그라디언트 대신 outline으로
// 위계를 낮춘다. CategoryManager 등과 동일하게 열릴 때만 Dialog(+ BudgetManager)를 마운트한다 —
// 상시 마운트하면 BudgetManager 내부 useState(formTarget 등)가 다음 열림에도 초기화되지 않는다.
export function BudgetManagerDialog({ type, className }: Props) {
  const { labelOf } = useMeta()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border text-xs font-medium hover:bg-accent',
          className,
        )}
      >
        <Plus className="size-3.5" />
        예산 등록
      </button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{`${labelOf('financeCategoryTypes', type)} 예산 관리`}</DialogTitle>
              <DialogDescription>카테고리별 월 예산을 등록·수정·삭제합니다.</DialogDescription>
            </DialogHeader>
            <BudgetManager type={type} />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
