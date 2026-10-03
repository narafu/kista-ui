'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormActions } from '@shared/ui/FormActions'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
import type { DismissMode } from '@shared/lib/dismiss'
import {
  budgetListHref,
  monthStartDate,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateFinanceBudgetMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FinanceBudgetRequest, FlowType } from '@entities/finance'

interface Props {
  type: FlowType
  initial?: FinanceBudget
  // 예산 복제 전용 — initial과 달리 id를 갖지 않아 항상 create 모드로 제출된다. 카테고리·금액·
  // 적용기간까지 전부 그대로 프리필한다("복사"는 말 그대로 복사, 필요한 값은 사용자가 직접 수정).
  // 원본 기간을 그대로 제출하면 겹침 금지 EXCLUDE 제약(409)에 걸리므로 사용자가 날짜를 바꿔야
  // 제출되는데, 그 전제로 값을 비워두지 않고 그대로 보여준다.
  duplicateFrom?: Pick<FinanceBudget, 'categoryId' | 'amount' | 'applyStartDate' | 'applyEndDate'>
  // 예산 미설정 카테고리 빠른 등록 — 카테고리만 프리필하는 일반 추가(복제 아님).
  defaultCategoryId?: string
  // 'push'(기본): 일반 페이지 라우트 — 예산 목록으로 이동. 'back': 인터셉팅 라우트(모달) — 이전 화면으로 복귀
  dismiss?: DismissMode
}

// 달력 위젯에서 연도 0000·임의 큰 값 등 극단값을 입력하면 서버가 예기치 못한 오류를 낼 수 있어
// input 자체에서 방어적으로 합리적 연도 범위로 제한한다.
const MIN_APPLY_DATE = '1900-01-01'
const MAX_APPLY_DATE = '2999-12-31'

// 제목·설명은 렌더하지 않는다 — 라우트 Body의 PageHeader(h1)가 맡아 RouteModal 대화상자 이름이 된다.
export function BudgetForm({ type, initial, duplicateFrom, defaultCategoryId, dismiss = 'push' }: Props) {
  const router = useRouter()
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(budgetListHref(type))
  const { data: categoryTree = [] } = useFinanceCategoriesQuery(type)

  const mode = initial ? 'edit' : 'create'
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
      onSuccess: handleDone,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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

      <FormActions onCancel={handleDone} isPending={isPending} canSubmit={canSubmit} label="저장" className="pt-2" />
    </form>
  )
}
