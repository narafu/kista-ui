'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { selectAllOnFocus } from '@shared/ui/select-all-on-focus'
import { cn } from '@shared/lib/utils'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { FormActions } from '@shared/ui/FormActions'
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
import type { AssetClass, AssetSnapshot, FinanceAccount, Market } from '@entities/finance'
import { DEFAULT_STRATEGY_SUGGESTIONS, useMeQuery } from '@entities/user'
import { AccountField, ComboField, MarketAssetClassFields } from './AssetFormFields'
import { FIXED_ASSET_META, MODE_LABEL, buildAssetPayload, categoryChangeEffect, initialFormValues, isEntryLocked } from './model/assetFormHelpers'
import type { AssetFormMode } from './model/assetFormHelpers'

export type { AssetFormMode }

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
  onSuccess: () => void
  onCancel: () => void
}

export function AssetForm({ mode, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const { data: categories = [] } = useFinanceCategoriesQuery('ASSET')
  const { data: accounts = [] } = useFinanceAccountsQuery()
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

  const init = initialFormValues(initial, todayKst())
  const [entryDate, setEntryDate] = useState(init.entryDate)
  const { data: monthlyClosings = [] } = useMonthlyClosingsQuery()
  const closingScopeGroupId = useMonthlyClosingScopeGroupId()
  const monthClosed = isEntryLocked(monthlyClosings, closingScopeGroupId, entryDate, mode, initial)
  const { selectedPath, setSelectedPath, cascadeLevels, categoryId } = useCategoryPathState(categories, initial?.categoryId)
  // 운용전략 필드는 L1 카테고리가 '투자'(고정 시스템 카테고리)일 때만 노출한다.
  const showStrategy = isInvestmentCategoryId(selectedPath[0])
  const fixedAssetMeta = FIXED_ASSET_META[selectedPath[0] ?? '']
  const [accountId, setAccountId] = useState(init.accountId)
  const [assetClass, setAssetClass] = useState<AssetClass>(init.assetClass)
  const [market, setMarket] = useState<Market>(init.market)
  const [strategy, setStrategy] = useState(init.strategy)
  const [memo, setMemo] = useState(init.memo)
  const [amountDigits, setAmountDigits] = useState(init.amountDigits)

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — edit 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateAssetSnapshotMutation()
  const updateMutation = useUpdateAssetSnapshotMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const canSubmit = entryDate !== '' && categoryId !== '' && amountDigits !== '' && !monthClosed

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload = buildAssetPayload({ categoryId, accountId, entryDate, assetClass, market, strategy, memo, amountDigits })

    if (mode === 'edit') {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('자산 기록이 수정되었습니다')
          onSuccess()
        },
      })
      return
    }

    createMutation.mutate({ ...payload, shareToGroup: canShareToGroup && shareToGroup }, {
      onSuccess: () => {
        toast.success(mode === 'duplicate' ? '자산 기록이 복제되었습니다' : '자산 기록이 등록되었습니다')
        onSuccess()
      },
    })
  }

  const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-xl">
        <div className={cn(cardClass, 'space-y-4')}>
          <div className="space-y-2">
            <Label htmlFor="entryDate">기준일</Label>
            <Input
              id="entryDate"
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
              disabled={isPending}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">카테고리</Label>
            <div className="space-y-2">
              <CascadingCategorySelect
                levels={cascadeLevels}
                path={selectedPath}
                onPathChange={(next) => {
                  const effect = categoryChangeEffect(selectedPath[0], next)
                  if (effect.clearStrategy) setStrategy('')
                  if (effect.fixed) {
                    setAssetClass(effect.fixed.assetClass)
                    setMarket(effect.fixed.market)
                  }
                  setSelectedPath(next)
                }}
                allowClear={false}
                id="category"
                className="w-full h-12"
                disabled={isPending}
              />
            </div>
          </div>

          {!fixedAssetMeta && (
            <MarketAssetClassFields
              meta={meta}
              market={market}
              assetClass={assetClass}
              onMarketChange={setMarket}
              onAssetClassChange={setAssetClass}
              disabled={isPending}
            />
          )}

          <AccountField accounts={accounts} accountsByType={accountsByType} value={accountId} onChange={setAccountId} disabled={isPending} />

          <div className="space-y-2">
            <Label htmlFor="memo">메모 (선택)</Label>
            <Input
              id="memo"
              placeholder="자유롭게 메모를 남겨보세요"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              disabled={isPending}
              maxLength={255}
              className="h-12"
            />
          </div>

          {showStrategy && (
            <ComboField
              id="strategy"
              label="운용전략 (선택)"
              placeholder="예: VR, 자유 메모"
              value={strategy}
              onChange={setStrategy}
              suggestions={strategySuggestions}
              selectLabel="운용전략 목록에서 선택"
              disabled={isPending}
              maxLength={50}
              helperText="자동매매 전략과 무관한 자유 메모입니다."
            />
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">금액 (원)</Label>
            <Input
              id="amount"
              inputMode="numeric"
              placeholder="0"
              value={formatAmountDisplay(amountDigits)}
              onChange={(e) => setAmountDigits(digitsOnly(e.target.value))}
              onFocus={selectAllOnFocus}
              disabled={isPending}
              className="h-12 text-right tabular-nums"
            />
          </div>

          {mode !== 'edit' && canShareToGroup && (
            <ShareToGroupSwitch id="assetShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
          )}

          {/* 저장이 막힌 이유를 버튼 바로 위에서 알린다. 문장 단위 inline-block이라 줄바꿈되면 문장마다 끊긴다. */}
          {monthClosed && (
            <p className="text-xs text-[var(--warn)]">
              <span className="inline-block">기록 점검이 완료되어 잠겨 있습니다.</span>{' '}
              <span className="inline-block">자산탭 기록 점검에서 완료를 해제하세요.</span>
            </p>
          )}

          <FormActions onCancel={onCancel} isPending={isPending} canSubmit={canSubmit} label={MODE_LABEL[mode]} className="pt-2" />
        </div>
      </div>
    </form>
  )
}
