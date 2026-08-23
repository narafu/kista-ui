'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { CascadingCategorySelect } from '@shared/ui/CascadingCategorySelect'
import { cn } from '@shared/lib/utils'
import { digitsOnly, formatAmountDisplay, todayKst } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import {
  getCascadeLevels,
  getCategoryPath,
  isInvestmentCategoryId,
  useCanShareToGroup,
  useCreateAssetSnapshotMutation,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
  useUpdateAssetSnapshotMutation,
} from '@entities/finance'
import type { AssetClass, AssetSnapshot, AssetSnapshotRequest, FinanceAccount, Market } from '@entities/finance'
import { DEFAULT_STRATEGY_SUGGESTIONS, useMeQuery } from '@entities/user'

export type AssetFormMode = 'create' | 'edit' | 'duplicate'

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
  onSuccess: () => void
  onCancel: () => void
}

// 계좌 Select 미선택("미지정") 센티널 — Base UI Select는 빈 문자열 value를 허용하지 않는다.
const NO_ACCOUNT_VALUE = 'NONE'

const MODE_LABEL: Record<AssetFormMode, string> = {
  create: '등록',
  edit: '수정',
  duplicate: '복제 등록',
}

// 계좌 자체의 메모(FinanceAccount.memo)가 있으면 Select 라벨에 이어붙여 어느 계좌인지 구분하기 쉽게 한다.
function accountOptionLabel(account: FinanceAccount): string {
  return account.memo ? `${account.name} · ${account.memo}` : account.name
}

interface ComboFieldProps {
  id: string
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  suggestions: string[]
  selectLabel: string
  disabled?: boolean
  maxLength?: number
  helperText?: string
}

// 운용전략 자유 입력 Input과 추천 목록 Select를 한 필드로 묶는다. Select는 값을 선택 즉시
// onChange로 흘려보낼 뿐 자체 선택 상태를 갖지 않는다(자유 입력이 SSOT).
function ComboField({
  id,
  label,
  placeholder,
  value,
  onChange,
  suggestions,
  selectLabel,
  disabled,
  maxLength,
  helperText,
}: ComboFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Select
          items={suggestions.map((s) => ({ value: s, label: s }))}
          onValueChange={(next: string | null) => { if (next) onChange(next) }}
        >
          <SelectTrigger aria-label={selectLabel} className="w-32 h-12 shrink-0" disabled={disabled}>
            <SelectValue>목록</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {suggestions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          className="h-12 flex-1"
        />
      </div>
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  )
}

export function AssetForm({ mode, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const { data: categories = [] } = useFinanceCategoriesQuery('ASSET')
  const { data: accounts = [] } = useFinanceAccountsQuery()
  // 운용전략 추천 목록은 유저별 설정(user_settings.strategy_suggestions)이 SSOT다 — strategy는
  // 여전히 자유 입력이라 유저 정보 로딩 전에는 알려진 기본값으로 폴백한다.
  const strategySuggestions = useMeQuery().data?.strategySuggestions ?? DEFAULT_STRATEGY_SUGGESTIONS

  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayKst())
  // 계단식 카테고리 Select: 각 단에서 선택한 categoryId를 순서대로 담는다. 마지막 값이
  // 실제 제출용 categoryId — 트리 깊이가 늘어나도 이 상태 하나로 임의 depth를 표현한다.
  const [selectedPath, setSelectedPath] = useState<string[]>(() =>
    initial ? getCategoryPath(categories, initial.categoryId).map((c) => c.id) : []
  )
  // edit/duplicate 모드는 카테고리 쿼리가 마운트 시점에 아직 로딩 중일 수 있어, 데이터가
  // 도착한 뒤 한 번 더 경로를 복원한다(이미 선택된 경로가 있으면 건드리지 않는다).
  useEffect(() => {
    if (initial && selectedPath.length === 0 && categories.length > 0) {
      setSelectedPath(getCategoryPath(categories, initial.categoryId).map((c) => c.id))
    }
  }, [initial, categories, selectedPath.length])
  const cascadeLevels = useMemo(() => getCascadeLevels(categories, selectedPath), [categories, selectedPath])
  const categoryId = selectedPath[selectedPath.length - 1] ?? ''
  // 운용전략 필드는 L1 카테고리가 '투자'(고정 시스템 카테고리)일 때만 노출한다.
  const showStrategy = isInvestmentCategoryId(selectedPath[0])
  const [accountId, setAccountId] = useState(initial?.accountId ?? NO_ACCOUNT_VALUE)
  const [assetClass, setAssetClass] = useState<AssetClass>(initial?.assetClass ?? 'CASH')
  const [market, setMarket] = useState<Market>(initial?.market ?? 'DOMESTIC')
  const [strategy, setStrategy] = useState(initial?.strategy ?? '')
  const [memo, setMemo] = useState(initial?.memo ?? '')
  const [amountDigits, setAmountDigits] = useState(initial ? String(initial.amount) : '')

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — edit 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)

  const createMutation = useCreateAssetSnapshotMutation()
  const updateMutation = useUpdateAssetSnapshotMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  const canSubmit = entryDate !== '' && categoryId !== '' && amountDigits !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: AssetSnapshotRequest = {
      categoryId,
      accountId: accountId === NO_ACCOUNT_VALUE ? undefined : accountId,
      entryDate,
      assetClass,
      market,
      // 화면에는 L1이 '투자'일 때만 노출되지만, 필드 자체는 카테고리 무관 자유 필드다(구 제약의
      // 후계 없음) — 비노출 상태에서도 기존 값(레거시 기록 등)을 건드리지 않고 그대로 제출한다.
      strategy: strategy.trim() || undefined,
      memo: memo.trim() || undefined,
      amount: Number(amountDigits),
    }

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
      onSuccess: (saved, variables) => {
        if (variables.shareToGroup && !saved.groupId) {
          toast.warning('자산 기록은 저장됐지만 그룹 공유에 실패했습니다 — 목록에서 공유 버튼으로 다시 시도하세요')
        } else {
          toast.success(mode === 'duplicate' ? '자산 기록이 복제되었습니다' : '자산 기록이 등록되었습니다')
        }
        onSuccess()
      },
    })
  }

  const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

  return (
    <form onSubmit={handleSubmit}>
      <div className="max-w-xl pb-24 sm:pb-0">
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
                  // L1을 '투자' 아닌 값으로 직접 바꾸면 전략 필드가 그 자리에서 숨겨지므로, 화면에
                  // 남아있던(잠재적으로 방금 입력한) 값도 함께 비운다 — 사용자가 능동적으로 L1을
                  // 바꾼 경우에만 지운다(next[0]이 이전 selectedPath[0]과 달라진 경우로 판정 —
                  // 하위 레벨 선택으로는 next[0]이 그대로라 이 조건에 걸리지 않는다). 편집 진입 시
                  // 기존 레코드를 복원하는 경로는 건드리지 않는다.
                  if (next[0] !== selectedPath[0] && !isInvestmentCategoryId(next[0])) setStrategy('')
                  setSelectedPath(next)
                }}
                allowClear={false}
                id="category"
                className="w-full h-12"
                disabled={isPending}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">계좌 (선택)</Label>
            <Select
              items={[{ value: NO_ACCOUNT_VALUE, label: '계좌 미지정' }, ...accounts.map((a) => ({ value: a.id, label: accountOptionLabel(a) }))]}
              value={accountId}
              onValueChange={(value) => { if (value) setAccountId(value) }}
            >
              <SelectTrigger id="account" className="w-full h-12" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT_VALUE}>계좌 미지정</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{accountOptionLabel(a)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetClass">자산군</Label>
            <Select
              items={meta.assetClasses.map((c) => ({ value: c.code, label: c.label }))}
              value={assetClass}
              onValueChange={(value) => { if (value) setAssetClass(value as AssetClass) }}
            >
              <SelectTrigger id="assetClass" className="w-full h-12" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meta.assetClasses.map((c) => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="market">시장</Label>
            <Select
              items={meta.markets.map((m) => ({ value: m.code, label: m.label }))}
              value={market}
              onValueChange={(value) => { if (value) setMarket(value as Market) }}
            >
              <SelectTrigger id="market" className="w-full h-12" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {meta.markets.map((m) => <SelectItem key={m.code} value={m.code}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

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
              disabled={isPending}
              className="h-12 text-right tabular-nums"
            />
          </div>

          {mode !== 'edit' && canShareToGroup && (
            <ShareToGroupSwitch id="assetShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
          )}

          <div className="hidden sm:flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={isPending}
              className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-12')}
            >
              취소
            </button>
            <Button type="submit" className="flex-1 h-12 gap-2" disabled={isPending || !canSubmit}>
              {isPending ? (
                <>
                  <Spinner size={14} />
                  저장 중...
                </>
              ) : MODE_LABEL[mode]}
            </Button>
          </div>
        </div>
      </div>

      <div className="sm:hidden fixed bottom-14 left-0 right-0 p-4 bg-background border-t z-40 flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className={cn(buttonVariants({ variant: 'outline' }), 'flex-1 h-14')}
        >
          취소
        </button>
        <Button type="submit" className="flex-1 h-14 text-base font-semibold gap-2" disabled={isPending || !canSubmit}>
          {isPending ? (
            <>
              <Spinner size={16} aria-hidden="true" />
              저장 중...
            </>
          ) : MODE_LABEL[mode]}
        </Button>
      </div>
    </form>
  )
}
