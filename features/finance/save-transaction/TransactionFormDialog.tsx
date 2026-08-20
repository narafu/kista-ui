'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { todayKst } from '@shared/lib/format'
import {
  getCascadeLevels,
  getCategoryPath,
  useCreateFinanceTransactionMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceTransactionMutation,
} from '@entities/finance'
import type { FinanceCategoryType, FinanceTransaction, FinanceTransactionRequest } from '@entities/finance'

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, '')
}

function formatAmountDisplay(digits: string) {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  initial?: FinanceTransaction
  onSuccess: () => void
  // 현재 화면이 조회 중인 12개월 윈도우('YYYY-MM-DD'). FinanceDashboard의 windowRange(period.month)
  // 결과를 그대로 내려받는다 — 이 범위 밖 날짜로 등록하면 저장은 되지만 지금 보고 있는 요약·추이·
  // 내역 어디에도 나타나지 않아(다른 달을 조회해야 보임) 혼란을 준다. 날짜 입력 자체를 이 범위로
  // 막고, 새로 등록할 때 기본값도 범위 안으로 clamp한다.
  windowFrom?: string
  windowTo?: string
}

function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min
  if (max && date > max) return max
  return date
}

export function TransactionFormDialog({ open, onOpenChange, type, initial, onSuccess, windowFrom, windowTo }: Props) {
  const mode = initial ? 'edit' : 'create'
  const { data: categories = [] } = useFinanceCategoriesQuery(type)

  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate ?? clampDate(todayKst(), windowFrom, windowTo))
  // 계단식 카테고리 Select: AssetForm과 동일 패턴 — selectedPath 마지막 값이 실제 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    initial ? getCategoryPath(categories, initial.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다.
  useEffect(() => {
    if (initial && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, initial.categoryId).map((c) => c.id))
    }
  }, [initial, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  const [amountDigits, setAmountDigits] = useState(initial ? String(initial.amount) : '')
  const [memo, setMemo] = useState(initial?.memo ?? '')

  const createMutation = useCreateFinanceTransactionMutation()
  const updateMutation = useUpdateFinanceTransactionMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const dateInWindow = (!windowFrom || transactionDate >= windowFrom) && (!windowTo || transactionDate <= windowTo)
  const canSubmit = transactionDate !== '' && dateInWindow && categoryId !== '' && amountDigits !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceTransactionRequest = {
      categoryId,
      transactionDate,
      amount: Number(amountDigits),
      memo: memo.trim() || undefined,
    }

    if (mode === 'edit') {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('거래내역이 수정되었습니다')
          onSuccess()
        },
      })
      return
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('거래내역이 등록되었습니다')
        onSuccess()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '거래내역 수정' : '거래내역 등록'}</DialogTitle>
            <DialogDescription>날짜, 카테고리, 금액을 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="transactionDate">날짜</Label>
              <Input
                id="transactionDate"
                type="date"
                min={windowFrom}
                max={windowTo}
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">카테고리</Label>
              <div className="space-y-2">
                {cascadeLevels.map((level, levelIndex) => (
                  <Select
                    key={levelIndex}
                    items={level.map((c) => ({ value: c.id, label: c.name }))}
                    value={selectedPath[levelIndex] || null}
                    onValueChange={(value) => {
                      if (!value) return
                      setSelectedPath((prev) => [...prev.slice(0, levelIndex), value])
                    }}
                  >
                    <SelectTrigger id={levelIndex === 0 ? 'category' : undefined} className="w-full h-11" disabled={isPending}>
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">금액 (원)</Label>
              <Input
                id="amount"
                inputMode="numeric"
                placeholder="0"
                value={formatAmountDisplay(amountDigits)}
                onChange={(e) => setAmountDigits(digitsOnly(e.target.value))}
                disabled={isPending}
                className="h-11 text-right tabular-nums"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="memo">메모 (선택)</Label>
              <Input
                id="memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                disabled={isPending}
                maxLength={255}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !canSubmit} className="gap-2">
              {isPending ? (<><Spinner size={14} />저장 중...</>) : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
