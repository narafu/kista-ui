'use client'

import { useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { cn } from '@shared/lib/utils'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { FormActions } from '@shared/ui/FormActions'
import { FormField } from '@shared/ui/form/FormField'
import { useAppForm } from '@shared/ui/form/useAppForm'
import { InputWithUnit } from '@shared/ui/InputUnitSuffix'
import { MonthClosedNotice } from '@shared/ui/MonthClosedNotice'
import { useMeta } from '@entities/meta'
import {
  isInvestmentCategoryId,
  useMonthlyClosingScopeGroupId,
  useCanShareToGroup,
  useCategoryPathState,
  useCreateAssetSnapshotMutation,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
  useMonthlyClosingsQuery,
  useUpdateAssetSnapshotMutation,
} from '@entities/finance'
import type { AssetSnapshot, AssetSnapshotRequest, FinanceAccount, FinanceCategory } from '@entities/finance'
import { DEFAULT_STRATEGY_SUGGESTIONS, useMeQuery } from '@entities/user'
import { AccountField, ComboField, MarketAssetClassFields } from './AssetFormFields'
import { FIXED_ASSET_META, MODE_LABEL, MODE_PENDING_LABEL, assetFormSchema, buildAssetPayload, categoryChangeEffect, initialFormValues, isEntryLocked } from './model/assetFormHelpers'
import type { AssetFormMode } from './model/assetFormHelpers'

export type { AssetFormMode }

// 조회 전·실패 시 useMemo 의존성 참조를 고정한다
const EMPTY_CATEGORIES: FinanceCategory[] = []
const EMPTY_ACCOUNTS: FinanceAccount[] = []

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
  onSuccess: () => void
  onCancel: () => void
}

export function AssetForm({ mode, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const categoriesQuery = useFinanceCategoriesQuery('ASSET')
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES
  const accountsQuery = useFinanceAccountsQuery()
  const accounts = accountsQuery.data ?? EMPTY_ACCOUNTS
  // 목록을 못 받으면 Select가 빈 채로 남아 저장이 왜 막혔는지 알 수 없다 — 이유를 필드 아래에 알린다.
  const categoriesFailed = categoriesQuery.isError && !categoriesQuery.data
  const accountsFailed = accountsQuery.isError && !accountsQuery.data
  // 계좌 Select 정렬: accountType별로 묶고(순서는 meta.financeAccountTypes 기준) 그룹 내에서는 이름 가나다순.
  const accountsByType = useMemo(() => {
    const groups: { type: string; label: string; accounts: FinanceAccount[] }[] = []
    for (const typeMeta of meta.financeAccountTypes) {
      const inType = accounts.filter((a) => a.accountType === typeMeta.code).sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      if (inType.length > 0) groups.push({ type: typeMeta.code, label: typeMeta.label, accounts: inType })
    }
    return groups
  }, [accounts, meta.financeAccountTypes])
  // 운용전략 추천 목록은 유저별 설정(user_settings.strategy_suggestions)이 SSOT다 — strategy는
  // 여전히 자유 입력이라 유저 정보 로딩 전에는 알려진 기본값으로 폴백한다.
  const strategySuggestions = useMeQuery().data?.strategySuggestions ?? DEFAULT_STRATEGY_SUGGESTIONS

  const createMutation = useCreateAssetSnapshotMutation()
  const updateMutation = useUpdateAssetSnapshotMutation(initial?.id ?? '')
  // 그룹 소속일 때만 스위치를 노출한다 — edit 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const form = useAppForm({
    schema: assetFormSchema,
    defaultValues: initialFormValues(initial, todayKst()),
    mutation: mode === 'edit' ? updateMutation : createMutation,
    toPayload: ({ shareToGroup, ...values }): AssetSnapshotRequest & { shareToGroup?: boolean } => {
      const payload = buildAssetPayload(values)
      return mode === 'edit' ? payload : { ...payload, shareToGroup: canShareToGroup && shareToGroup }
    },
    successMessage: mode === 'edit' ? '자산 기록이 수정되었습니다' : mode === 'duplicate' ? '자산 기록이 복제되었습니다' : '자산 기록이 등록되었습니다',
    onDone: onSuccess,
  })
  const [entryDate, categoryId, amountDigits] = form.watch(['entryDate', 'categoryId', 'amountDigits'])
  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const closingScopeGroupId = useMonthlyClosingScopeGroupId()
  const monthClosed = isEntryLocked(monthlyClosings, closingScopeGroupId, entryDate, mode, initial)
  // 경로로 풀리지 않는 categoryId(삭제된 카테고리·목록 로드 실패)는 제출을 잠근다 — 전환 전과 같이 경로 기준으로 판정
  const { selectedPath, setSelectedPath, cascadeLevels, categoryId: pathCategoryId } = useCategoryPathState(categories, initial?.categoryId)
  // 운용전략 필드는 L1 카테고리가 '투자'(고정 시스템 카테고리)일 때만 노출한다.
  const showStrategy = isInvestmentCategoryId(selectedPath[0])
  const fixedAssetMeta = FIXED_ASSET_META[selectedPath[0] ?? '']
  const isPending = form.isPending

  const canSubmit = entryDate !== '' && categoryId !== '' && pathCategoryId !== '' && amountDigits !== '' && !monthClosed

  const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

  return (
    <form onSubmit={(e) => (canSubmit ? form.submit(e) : e.preventDefault())}>
      <div className="max-w-xl">
        <div className={cn(cardClass, 'space-y-4')}>
          <FormField control={form.control} name="entryDate" label="기준일" required>
            {(f) => <Input {...f} type="date" disabled={isPending} className="h-11" />}
          </FormField>

          <FormField control={form.control} name="categoryId" label="카테고리" required id="category">
            {(f) => (
              <CascadingCategorySelect
                levels={cascadeLevels}
                path={selectedPath}
                onPathChange={(next) => {
                  const effect = categoryChangeEffect(selectedPath[0], next)
                  if (effect.clearStrategy) form.setValue('strategy', '')
                  if (effect.fixed) {
                    form.setValue('assetClass', effect.fixed.assetClass)
                    form.setValue('market', effect.fixed.market)
                  }
                  setSelectedPath(next)
                  f.onChange(next.at(-1) ?? '')
                }}
                allowClear={false}
                id={f.id}
                className="w-full h-11"
                disabled={isPending}
              />
            )}
          </FormField>
          {categoriesFailed && (
            <p className="text-xs text-destructive">카테고리 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>
          )}

          {!fixedAssetMeta && <MarketAssetClassFields control={form.control} meta={meta} disabled={isPending} />}

          <AccountField control={form.control} accounts={accounts} accountsByType={accountsByType} disabled={isPending} loadFailed={accountsFailed} />

          <FormField control={form.control} name="memo" label="메모">
            {(f) => <Input {...f} placeholder="자유롭게 메모를 남겨보세요" disabled={isPending} maxLength={255} className="h-11" />}
          </FormField>

          {showStrategy && <ComboField control={form.control} placeholder="예: VR, 자유 메모" suggestions={strategySuggestions} disabled={isPending} />}

          <FormField control={form.control} name="amountDigits" label="금액" id="amount">
            {(f) => (
              <InputWithUnit unit="원" unitId="amountUnit">
                <Input
                  {...f}
                  aria-describedby={[f['aria-describedby'], 'amountUnit'].filter(Boolean).join(' ')}
                  inputMode="numeric"
                  placeholder="0"
                  value={formatAmountDisplay(f.value)}
                  onChange={(e) => f.onChange(digitsOnly(e.target.value))}
                  onFocus={selectAllOnFocus}
                  disabled={isPending}
                  className="h-11 pr-8 text-right tabular-nums"
                />
              </InputWithUnit>
            )}
          </FormField>

          {mode !== 'edit' && canShareToGroup && (
            <ShareToGroupSwitch id="assetShareToGroup" checked={form.watch('shareToGroup')} onCheckedChange={(checked) => form.setValue('shareToGroup', checked)} disabled={isPending} />
          )}

          {/* 저장이 막힌 이유를 버튼 바로 위에서 알린다 */}
          {monthClosed && <MonthClosedNotice />}

          <FormActions onCancel={onCancel} form={form} canSubmit={canSubmit} label={MODE_LABEL[mode]} pendingLabel={MODE_PENDING_LABEL[mode]} className="pt-2" />
        </div>
      </div>
    </form>
  )
}
