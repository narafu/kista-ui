'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
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
  initial?: FinanceBudget
  // 예산 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액만
  // 프리필한다. applyStartDate/applyEndDate는 절대 시드로 넣지 않는다 — 예산은 카테고리별
  // applyStartDate에 겹침 금지 EXCLUDE 제약(409)이 있어, 기존 기간을 그대로 복제하면 곧바로
  // 충돌하기 때문에 사용자가 새 기간을 직접 입력해야 한다(TransactionFormDialog의
  // initial/duplicateFrom 분리 패턴과 동일).
  duplicateFrom?: Pick<FinanceBudget, 'categoryId' | 'amount'>
  onSuccess: () => void
}

export function BudgetFormDialog({ open, onOpenChange, categoryTree, initial, duplicateFrom, onSuccess }: Props) {
  const mode = initial ? 'edit' : 'create'
  const seed = initial ?? duplicateFrom

  // 계단식 카테고리 Select — TransactionFormDialog와 동일 패턴, selectedPath 마지막 값이 제출용 categoryId.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    seed ? getCategoryPath(categoryTree, seed.categoryId).map((c) => c.id) : []
  )
  // 다이얼로그가 카테고리 쿼리 로딩보다 먼저 열릴 수 있어, 데이터 도착 후 한 번 더 경로를 복원한다
  // (TransactionFormDialog와 동일 패턴).
  useEffect(() => {
    if (seed && selectedPath.length === 0 && categoryTree.length > 0) {
      setSelectedPath(getCategoryPath(categoryTree, seed.categoryId).map((c) => c.id))
    }
  }, [seed, categoryTree, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categoryTree, selectedPath), [categoryTree, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''

  // applyStartDate/applyEndDate는 initial(수정)에서만 시드로 채운다 — duplicateFrom은 위 주석 참고.
  const [applyStartDate, setApplyStartDate] = useState(initial?.applyStartDate ?? '')
  const [applyEndDate, setApplyEndDate] = useState(initial?.applyEndDate ?? '')
  const [amountDigits, setAmountDigits] = useState(seed ? String(seed.amount) : '')

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateFinanceBudgetMutation()
  const updateMutation = useUpdateFinanceBudgetMutation(initial?.id ?? '')
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
      onSuccess: (saved, variables) => {
        if (variables.shareToGroup && !saved.groupId) {
          toast.warning('예산은 저장됐지만 그룹 공유에 실패했습니다 — 목록에서 공유 버튼으로 다시 시도하세요')
        } else {
          toast.success('예산이 등록되었습니다')
        }
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
              <ShareToGroupSwitch id="budgetShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
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
