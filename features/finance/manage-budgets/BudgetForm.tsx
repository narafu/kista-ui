'use client'

import { useEffect } from 'react'
import { z } from 'zod'
import { Input } from '@/components/ui/input'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { InputWithUnit } from '@shared/ui/InputUnitSuffix'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import {
  monthStartDate,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateFinanceBudgetMutation,
  useFinanceCategoriesQuery,
  useUpdateFinanceBudgetMutation,
} from '@entities/finance'
import type { FinanceBudget, FinanceBudgetRequest, FlowType } from '@entities/finance'

// 금액은 입력 중 콤마 표시를 위해 숫자 문자열로 들고 있다가 제출 때 Number로 바꾼다
const schema = z.object({
  // 카테고리는 RHF 밖 계단식 상태(useCategoryPathState)를 미러링한다 — 요청 바디는 path 상태에서 만든다
  categoryId: z.string().min(1, '카테고리를 선택하세요.'),
  applyStartDate: z.string().min(1, '적용 시작일을 선택하세요.'),
  applyEndDate: z.string(),
  // amount<=0은 값이 없는 것으로 취급한다 — 0원 예산은 제출할 수 없다
  amount: z.string().min(1, '금액을 입력하세요.').refine((v) => Number(v) > 0, '0보다 큰 금액을 입력하세요.'),
  shareToGroup: z.boolean(),
})

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
  // 취소·제출 성공 때 부른다 — FormDialog의 close를 그대로 넘긴다
  onDone: () => void
}

// 달력 위젯에서 연도 0000·임의 큰 값 등 극단값을 입력하면 서버가 예기치 못한 오류를 낼 수 있어
// input 자체에서 방어적으로 합리적 연도 범위로 제한한다.
const MIN_APPLY_DATE = '1900-01-01'
const MAX_APPLY_DATE = '2999-12-31'

// 제목·설명은 렌더하지 않는다 — 호출부 FormDialog가 맡는다.
export function BudgetForm({ type, initial, duplicateFrom, defaultCategoryId, onDone }: Props) {
  const { data: categoryTree = [] } = useFinanceCategoriesQuery(type)

  const mode = initial ? 'edit' : 'create'
  const seed = initial ?? duplicateFrom

  // 카테고리 계단식 선택은 RHF 밖 상태다 — 제출 때 toPayload가 현재 categoryId를 읽는다
  const { selectedPath, setSelectedPath, cascadeLevels, categoryId } = useCategoryPathState(categoryTree, seed?.categoryId ?? defaultCategoryId)

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const createMutation = useCreateFinanceBudgetMutation()
  const updateMutation = useUpdateFinanceBudgetMutation(initial?.id ?? '')

  const form = useAppForm({
    schema,
    defaultValues: {
      categoryId,
      // 월 예산이라 신규 등록은 이번 달 1일을 기본 시작일로 둔다.
      applyStartDate: seed?.applyStartDate || monthStartDate(todayKst().slice(0, 7)),
      applyEndDate: seed?.applyEndDate ?? '',
      // amount<=0은 값이 없는 것으로 취급한다 — 0원 예산은 제출할 수 없다(zod).
      amount: seed && seed.amount > 0 ? String(seed.amount) : '',
      shareToGroup: true,
    },
    mutation: mode === 'edit' ? updateMutation : createMutation,
    toPayload: (v) => {
      const payload: FinanceBudgetRequest = {
        categoryId,
        applyStartDate: v.applyStartDate,
        applyEndDate: v.applyEndDate || undefined,
        amount: Number(v.amount),
      }
      return mode === 'edit' ? payload : { ...payload, shareToGroup: canShareToGroup && v.shareToGroup }
    },
    successMessage: mode === 'edit' ? '예산을 수정했습니다' : '예산을 추가했습니다',
    onDone,
  })

  const applyStartDate = form.watch('applyStartDate')
  const applyEndDate = form.watch('applyEndDate')
  const endBeforeStart = applyEndDate !== '' && applyEndDate < applyStartDate
  // 잠금 — 종료일이 시작일보다 빠르면 제출할 수 없다(hint가 이유를 알린다. 서버 검증 T7 전까지 유지)
  const locked = endBeforeStart

  // 계단식 선택(RHF 밖 상태)을 폼 필드로 미러링 — 선택 후 오류가 있던 필드는 바로 갱신한다
  const { setValue } = form
  const isSubmitted = form.formState.isSubmitted
  useEffect(() => { setValue('categoryId', categoryId, { shouldValidate: isSubmitted }) }, [setValue, categoryId, isSubmitted])

  return (
    <form onSubmit={(e) => (locked ? e.preventDefault() : form.submit(e))} className="space-y-4">
      <FormField control={form.control} name="categoryId" label="카테고리" required id="budgetCategory">
        {(f) => (
          <CascadingCategorySelect
            levels={cascadeLevels}
            path={selectedPath}
            onPathChange={setSelectedPath}
            allowClear={false}
            id={f.id}
            triggerRef={f.ref}
            aria-invalid={f['aria-invalid']}
            aria-describedby={f['aria-describedby']}
            aria-required={f['aria-required']}
            className="w-full h-11"
            disabled={form.isPending}
          />
        )}
      </FormField>

      <FormField control={form.control} name="applyStartDate" label="적용 시작일" required>
        {(f) => <Input {...f} type="date" min={MIN_APPLY_DATE} max={MAX_APPLY_DATE} disabled={form.isPending} className="h-11" />}
      </FormField>

      <FormField
        control={form.control}
        name="applyEndDate"
        label="적용 종료일"
        hint={endBeforeStart ? <span className="text-destructive">종료일은 시작일 이후여야 합니다.</span> : '비워두면 무기한 적용'}
      >
        {(f) => (
          <Input
            {...f}
            type="date"
            min={applyStartDate || MIN_APPLY_DATE}
            max={MAX_APPLY_DATE}
            disabled={form.isPending}
            aria-invalid={f['aria-invalid'] || endBeforeStart || undefined}
            className="h-11"
          />
        )}
      </FormField>

      <FormField control={form.control} name="amount" id="budgetAmount" label="월 예산" required>
        {(f) => (
          <InputWithUnit unit="원" unitId="budgetAmountUnit">
            <Input
              {...f}
              aria-describedby={[f['aria-describedby'], 'budgetAmountUnit'].filter(Boolean).join(' ')}
              inputMode="numeric"
              placeholder="0"
              value={formatAmountDisplay(f.value)}
              onChange={(e) => f.onChange(digitsOnly(e.target.value))}
              onFocus={selectAllOnFocus}
              disabled={form.isPending}
              className="h-11 pr-8 text-right tabular-nums"
            />
          </InputWithUnit>
        )}
      </FormField>

      {mode === 'create' && canShareToGroup && (
        <ShareToGroupSwitch id="budgetShareToGroup" checked={form.watch('shareToGroup')} onCheckedChange={(v) => form.setValue('shareToGroup', v)} disabled={form.isPending} />
      )}

      <FormActions form={form} onCancel={onDone} locked={locked} label={mode === 'edit' ? '수정' : '추가'} className="pt-2" />
    </form>
  )
}
