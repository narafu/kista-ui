'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay } from '@shared/lib/format'
import {
  notifyShareCreateResult,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateFinanceBudgetMutation,
  useUpdateFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FinanceBudgetRequest, FinanceCategory } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryTree: FinanceCategory[]
  initial?: FinanceBudget
  // 예산 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·
  // 적용기간까지 전부 그대로 프리필한다("복사"는 말 그대로 복사, 필요한 값은 사용자가 직접 수정).
  // 원본 기간을 그대로 제출하면 겹침 금지 EXCLUDE 제약(409)에 걸리므로 사용자가 날짜를 바꿔야
  // 제출되는데, 그 전제로 값을 비워두지 않고 그대로 보여준다.
  duplicateFrom?: Pick<FinanceBudget, 'categoryId' | 'amount' | 'applyStartDate' | 'applyEndDate'>
  onSuccess: () => void
}

// 달력 위젯에서 연도 0000·임의 큰 값 등 극단값을 입력하면 서버가 예기치 못한 오류를 낼 수 있어
// input 자체에서 방어적으로 합리적 연도 범위로 제한한다.
const MIN_APPLY_DATE = '1900-01-01'
const MAX_APPLY_DATE = '2999-12-31'

export function BudgetFormDialog({ open, onOpenChange, categoryTree, initial, duplicateFrom, onSuccess }: Props) {
  const mode = initial ? 'edit' : 'create'
  const seed = initial ?? duplicateFrom

  const { selectedPath, setSelectedPath, cascadeLevels, categoryId } = useCategoryPathState(categoryTree, seed?.categoryId)

  const [applyStartDate, setApplyStartDate] = useState(seed?.applyStartDate ?? '')
  const [applyEndDate, setApplyEndDate] = useState(seed?.applyEndDate ?? '')
  // amount<=0은 값이 없는 것으로 취급한다(예산 미설정 카테고리 빠른등록이 카테고리만 프리필하고
  // 금액은 0으로 넘길 때, 그대로 '0'을 채우면 canSubmit의 "금액 입력 필수" 가드가 무력화된다).
  const [amountDigits, setAmountDigits] = useState(seed && seed.amount > 0 ? String(seed.amount) : '')

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
        notifyShareCreateResult(saved, variables, '예산', '예산이 등록되었습니다')
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
                <CascadingCategorySelect
                  levels={cascadeLevels}
                  path={selectedPath}
                  onPathChange={setSelectedPath}
                  allowClear={false}
                  id="budgetCategory"
                  className="w-full h-11"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="applyStartDate">적용 시작일</Label>
              <Input
                id="applyStartDate"
                type="date"
                min={MIN_APPLY_DATE}
                max={MAX_APPLY_DATE}
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
                min={MIN_APPLY_DATE}
                max={MAX_APPLY_DATE}
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
                onFocus={selectAllOnFocus}
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
