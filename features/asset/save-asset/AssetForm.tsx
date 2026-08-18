'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { cn } from '@shared/lib/utils'
import { todayKst } from '@shared/lib/format'
import { useMeta } from '@entities/meta'
import {
  flattenFinanceCategories,
  useCreateAssetSnapshotMutation,
  useFinanceAccountsQuery,
  useFinanceCategoriesQuery,
  useUpdateAssetSnapshotMutation,
} from '@entities/finance'
import type { AssetClass, AssetSnapshot, AssetSnapshotRequest, Market } from '@entities/finance'
import { DEFAULT_ASSET_FORM_OPTIONS, useRuntimeConfigQuery } from '@entities/runtime-config'

export type AssetFormMode = 'create' | 'edit' | 'duplicate'

interface Props {
  mode: AssetFormMode
  initial?: AssetSnapshot
  onSuccess: () => void
  onCancel: () => void
}

// 계좌 Select 미선택("미지정") 센티널 — Base UI Select는 빈 문자열 value를 허용하지 않는다.
const NO_ACCOUNT_VALUE = 'NONE'

function digitsOnly(value: string) {
  return value.replace(/[^0-9]/g, '')
}

function formatAmountDisplay(digits: string) {
  return digits ? Number(digits).toLocaleString('ko-KR') : ''
}

const MODE_LABEL: Record<AssetFormMode, string> = {
  create: '등록',
  edit: '수정',
  duplicate: '복제 등록',
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
  const { data: categories = [] } = useFinanceCategoriesQuery()
  const { data: accounts = [] } = useFinanceAccountsQuery()
  // 운용전략 추천 목록은 kista-api 런타임 설정(관리자 수정 가능)이 SSOT다 — strategy는 여전히
  // 자유 입력이라 설정 로딩 전에는 알려진 기본값으로 폴백한다.
  const assetFormOptions = useRuntimeConfigQuery().data?.assetFormOptions ?? DEFAULT_ASSET_FORM_OPTIONS
  const flatCategories = useMemo(() => flattenFinanceCategories(categories), [categories])

  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayKst())
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [accountId, setAccountId] = useState(initial?.accountId ?? NO_ACCOUNT_VALUE)
  const [assetClass, setAssetClass] = useState<AssetClass>(initial?.assetClass ?? 'CASH')
  const [market, setMarket] = useState<Market>(initial?.market ?? 'DOMESTIC')
  const [strategy, setStrategy] = useState(initial?.strategy ?? '')
  // 복제 모드는 금액을 제외한 나머지 필드만 이어받는다 — 복제 시점마다 금액이 다른 게
  // 일반적인 사용 패턴이라, 이전 금액을 그대로 들고 있으면 고치는 걸 잊고 그대로 제출하기 쉽다.
  const [amountDigits, setAmountDigits] = useState(mode === 'edit' && initial ? String(initial.amount) : '')

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
      // 구 폼은 category === 'INVESTMENT'일 때만 전송했으나, kista-api AssetSnapshotRequest.strategy는
      // 카테고리 무관 자유 필드라 조건 없이 항상 전송한다(의도적 — 구 제약의 후계 없음).
      strategy: strategy.trim() || undefined,
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

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(mode === 'duplicate' ? '자산 기록이 복제되었습니다' : '자산 기록이 등록되었습니다')
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
            <Select
              items={flatCategories.map((c) => ({ value: c.id, label: c.depth === 1 ? `― ${c.name}` : c.name }))}
              value={categoryId || null}
              onValueChange={(value) => { if (value) setCategoryId(value) }}
            >
              <SelectTrigger id="category" className="w-full h-12" disabled={isPending}>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {flatCategories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.depth === 1 ? `― ${c.name}` : c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="account">계좌 (선택)</Label>
            <Select
              items={[{ value: NO_ACCOUNT_VALUE, label: '계좌 미지정' }, ...accounts.map((a) => ({ value: a.id, label: a.name }))]}
              value={accountId}
              onValueChange={(value) => { if (value) setAccountId(value) }}
            >
              <SelectTrigger id="account" className="w-full h-12" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT_VALUE}>계좌 미지정</SelectItem>
                {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
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

          <ComboField
            id="strategy"
            label="운용전략 (선택)"
            placeholder="예: VR, 자유 메모"
            value={strategy}
            onChange={setStrategy}
            suggestions={assetFormOptions.strategySuggestions}
            selectLabel="운용전략 목록에서 선택"
            disabled={isPending}
            maxLength={50}
            helperText="자동매매 전략과 무관한 자유 메모입니다."
          />

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

      <div className="sm:hidden fixed bottom-14 left-0 right-0 p-4 bg-background border-t z-40">
        <Button type="submit" className="w-full h-14 text-base font-semibold gap-2" disabled={isPending || !canSubmit}>
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
