'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import {
  getCascadeLevels,
  getCategoryPath,
  useCreateFinanceTransactionMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceTransactionMutation,
} from '@entities/finance'
import type { FinanceCategoryType, FinanceTransaction, FinanceTransactionRequest } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  initial?: FinanceTransaction
  // 내역 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·메모만
  // 프리필하고 날짜는 오늘로 초기화한다(clampDate 기본 동작 그대로 유지 — 아래서 별도 처리 안 함).
  duplicateFrom?: Pick<FinanceTransaction, 'categoryId' | 'amount' | 'memo'>
  onSuccess: () => void
  // 유효 날짜 범위('YYYY-MM-DD'). 호출부가 무엇을 넘기는지에 따라 의미가 다르다 —
  // 등록(NewTransactionButton)은 "오늘 기준" 독립 12개월 창(FinanceDashboard의 registerWindow),
  // 수정(FinanceRecordList)은 "지금 조회 중인" 12개월 창(windowRange(period.month))을 넘긴다.
  // 후자는 편집 대상 거래 자체가 그 창 안에서만 존재할 수 있어 조회 윈도우 그대로 쓰는 게 맞고,
  // 전자를 조회 윈도우에 묶으면 과거 달을 보는 중엔 오늘 날짜조차 등록 못 하게 막혀버린다(실사용
  // 시나리오로 지적됨) — 그래서 서로 다른 기준으로 분리했다. 날짜 입력 자체를 이 범위로 막고,
  // 새로 등록할 때 기본값도 범위 안으로 clamp한다.
  windowFrom?: string
  windowTo?: string
}

function clampDate(date: string, min?: string, max?: string): string {
  if (min && date < min) return min
  if (max && date > max) return max
  return date
}

export function TransactionFormDialog({ open, onOpenChange, type, initial, duplicateFrom, onSuccess, windowFrom, windowTo }: Props) {
  const mode = initial ? 'edit' : 'create'
  const { data: categories = [] } = useFinanceCategoriesQuery(type)
  const seed = initial ?? duplicateFrom

  const [transactionDate, setTransactionDate] = useState(initial?.transactionDate ?? clampDate(todayKst(), windowFrom, windowTo))
  // 계단식 카테고리 Select: AssetForm과 동일 패턴 — selectedPath 마지막 값이 실제 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    seed ? getCategoryPath(categories, seed.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다.
  useEffect(() => {
    if (seed && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, seed.categoryId).map((c) => c.id))
    }
  }, [seed, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  const [amountDigits, setAmountDigits] = useState(seed ? String(seed.amount) : '')
  const [memo, setMemo] = useState(seed?.memo ?? '')

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
