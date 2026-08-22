'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Spinner } from '@shared/ui/Spinner'
import { digitsOnly, formatAmountDisplay } from '@shared/lib/format'
import {
  getCascadeLevels,
  getCategoryPath,
  useCanShareToGroup,
  useCreateFinanceBudgetMutation,
  useUpdateFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FinanceBudgetRequest, FinanceCategory } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryTree: FinanceCategory[]
  budget: FinanceBudget | null
  onSuccess: () => void
}

export function BudgetFormDialog({ open, onOpenChange, categoryTree, budget, onSuccess }: Props) {
  const mode = budget ? 'edit' : 'create'

  // 계단식 카테고리 Select — TransactionFormDialog와 동일 패턴, selectedPath 마지막 값이 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    budget ? getCategoryPath(categoryTree, budget.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다
  // (TransactionFormDialog와 동일 패턴).
  useEffect(() => {
    if (budget && selectedPath.length === 0 && categoryTree.length > 0) {
      setSelectedPath(getCategoryPath(categoryTree, budget.categoryId).map((c) => c.id))
    }
  }, [budget, categoryTree, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, selectedPath), [categoryTree, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  const [applyStartDate, setApplyStartDate] = useState(budget?.applyStartDate ?? '')
  const [applyEndDate, setApplyEndDate] = useState(budget?.applyEndDate ?? '')
  const [amountDigits, setAmountDigits] = useState(budget ? String(budget.amount) : '')

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateFinanceBudgetMutation()
  const updateMutation = useUpdateFinanceBudgetMutation(budget?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const canSubmit = categoryId !== '' && applyStartDate !== '' && amountDigits !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceBudgetRequest = {
      categoryId,
      applyStartDate,
      applyEndDate: applyEndDate || undefined,
      amount: Number(amountDigits),
    }

    if (mode === 'edit') {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('예산이 수정되었습니다')
          onSuccess()
        },
      })
      return
    }

    createMutation.mutate({ ...payload, shareToGroup: canShareToGroup && shareToGroup }, {
      onSuccess: () => {
        toast.success('예산이 등록되었습니다')
        onSuccess()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '예산 수정' : '예산 추가'}</DialogTitle>
            <DialogDescription>카테고리, 적용 기간, 월 예산을 입력하세요.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="budgetCategory">카테고리</Label>
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
                    <SelectTrigger id={levelIndex === 0 ? 'budgetCategory' : undefined} className="w-full h-11" disabled={isPending}>
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
              <Label htmlFor="applyStartDate">적용 시작일</Label>
              <Input
                id="applyStartDate"
                type="date"
                value={applyStartDate}
                onChange={(e) => setApplyStartDate(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="applyEndDate">적용 종료일 (선택)</Label>
              <Input
                id="applyEndDate"
                type="date"
                value={applyEndDate}
                onChange={(e) => setApplyEndDate(e.target.value)}
                disabled={isPending}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">비워두면 무기한 적용</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budgetAmount">월 예산 (원)</Label>
              <Input
                id="budgetAmount"
                inputMode="numeric"
                placeholder="0"
                value={formatAmountDisplay(amountDigits)}
                onChange={(e) => setAmountDigits(digitsOnly(e.target.value))}
                disabled={isPending}
                className="h-11 text-right tabular-nums"
              />
            </div>

            {mode === 'create' && canShareToGroup && (
              <div className="flex items-center justify-between">
                <Label htmlFor="budgetShareToGroup">그룹으로 저장</Label>
                <Switch
                  id="budgetShareToGroup"
                  checked={shareToGroup}
                  onCheckedChange={setShareToGroup}
                  disabled={isPending}
                />
              </div>
            )}
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
