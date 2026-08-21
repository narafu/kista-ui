'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { BRAND_GRADIENT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import type { FinanceCategoryType } from '@entities/finance'
import { TransactionFormDialog } from './TransactionFormDialog'

interface Props {
  type: FinanceCategoryType
  className?: string
  // "오늘 기준" 독립 12개월 창(FinanceDashboard의 registerWindow) — 조회 중인 기간과 무관하게
  // 항상 같은 값이다. TransactionFormDialog로 그대로 전달해 이 범위 밖 날짜로 등록하는 걸
  // 막는다(왜 조회 윈도우가 아니라 독립 창인지는 TransactionFormDialog 주석 참고).
  windowFrom?: string
  windowTo?: string
}

export function NewTransactionButton({ type, className, windowFrom, windowTo }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs', BRAND_GRADIENT_BUTTON_CLASS, className)}
      >
        <Plus className="size-3.5" />
        내역 등록
      </button>
      {/* CategoryManager 등 다른 CRUD 다이얼로그와 동일하게 조건부 마운트 — 항상 마운트해두면
          내부 useState(날짜·카테고리·금액·메모)가 다음 열림에도 초기화되지 않고 이전 입력값이 남는다. */}
      {open && (
        <TransactionFormDialog
          open
          onOpenChange={setOpen}
          type={type}
          windowFrom={windowFrom}
          windowTo={windowTo}
          onSuccess={() => setOpen(false)}
        />
      )}
    </>
  )
}
