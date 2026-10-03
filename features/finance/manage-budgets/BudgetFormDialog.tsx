'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
import {
  monthStartDate,
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
  // 예산 미설정 카테고리 빠른 등록 — 카테고리만 프리필하는 일반 추가(복제 아님).
  defaultCategoryId?: string
  onSuccess: () => void
}

// 달력 위젯에서 연도 0000·임의 큰 값 등 극단값을 입력하면 서버가 예기치 못한 오류를 낼 수 있어
// input 자체에서 방어적으로 합리적 연도 범위로 제한한다.
const MIN_APPLY_DATE = '1900-01-01'
const MAX_APPLY_DATE = '2999-12-31'

export function BudgetFormDialog({ open, onOpenChange, categoryTree, initial, duplicateFrom, defaultCategoryId, onSuccess }: Props) {
  const mode = initial ? 'edit' : 'create'
  const isDuplicate = !initial && !!duplicateFrom
  const seed = initial ?? duplicateFrom

  const { selectedPath, setSelectedPath, cascadeLevels, categoryId } = useCategoryPathState(categoryTree, seed?.categoryId ?? defaultCategoryId)

  // 월 예산이라 신규 등록은 이번 달 1일을 기본 시작일로 둔다.
  const [applyStartDate, setApplyStartDate] = useState(seed?.applyStartDate || monthStartDate(todayKst().slice(0, 7)))
  const [applyEndDate, setApplyEndDate] = useState(seed?.applyEndDate ?? '')
  // amount<=0은 값이 없는 것으로 취급한다 — 0원 예산은 제출할 수 없다(canSubmit).
  const [amountDigits, setAmountDigits] = useState(seed && seed.amount > 0 ? String(seed.amount) : '')

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateFinanceBudgetMutation()
  const updateMutation = useUpdateFinanceBudgetMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const endBeforeStart = applyEndDate !== '' && applyEndDate < applyStartDate
  const canSubmit = categoryId !== '' && applyStartDate !== '' && !endBeforeStart && Number(amountDigits) > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: FinanceBudgetRequest = {
      categoryId,
      applyStartDate,
      applyEndDate: applyEndDate || undefined,
      amount: Number(amountDigits),
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: canShareToGroup && shareToGroup },
      messages: { create: '예산이 추가되었습니다', edit: '예산이 수정되었습니다' },
      onSuccess,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '예산 수정' : isDuplicate ? '예산 복제' : '예산 추가'}</DialogTitle>
            <DialogDescription>
              {isDuplicate
                ? '원본과 적용 기간이 겹치면 저장되지 않습니다. 적용 기간을 변경하세요.'
                : '카테고리, 적용 기간, 월 예산을 입력하세요.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="budgetCategory">카테고리</Label>
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
                min={applyStartDate || MIN_APPLY_DATE}
                max={MAX_APPLY_DATE}
                value={applyEndDate}
                onChange={(e) => setApplyEndDate(e.target.value)}
                disabled={isPending}
                aria-invalid={endBeforeStart || undefined}
                aria-describedby="applyEndDateHint"
                className="h-11"
              />
              {endBeforeStart ? (
                <p id="applyEndDateHint" className="text-xs text-destructive">종료일은 시작일 이후여야 합니다.</p>
              ) : (
                <p id="applyEndDateHint" className="text-xs text-muted-foreground">비워두면 무기한 적용</p>
              )}
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
            <SaveButton isPending={isPending} disabled={!canSubmit} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
