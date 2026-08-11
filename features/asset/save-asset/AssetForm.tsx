'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@shared/ui/Spinner'
import { cn } from '@shared/lib/utils'
import { todayKst } from '@shared/lib/format'
import { formatAssetCategoryLabel } from '@shared/lib/api-schema'
import { ASSET_CATEGORIES, useCreateAssetMutation, useUpdateAssetMutation } from '@entities/asset'
import type { Asset, AssetCategory, AssetRequest } from '@entities/asset'
import { DEFAULT_ASSET_FORM_OPTIONS, useRuntimeConfigQuery } from '@entities/runtime-config'

export type AssetFormMode = 'create' | 'edit' | 'duplicate'

interface Props {
  mode: AssetFormMode
  initial?: Asset
  onSuccess: () => void
  onCancel: () => void
}

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

// 세부 카테고리·기관·자산군·운용전략 공통 UI — 자유 입력 Input과 추천 목록 Select를 한 필드로 묶는다.
// Select는 값을 선택 즉시 onChange로 흘려보낼 뿐 자체 선택 상태를 갖지 않는다(자유 입력이 SSOT).
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
        <Input
          id={id}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          maxLength={maxLength}
          className="h-12 flex-1"
        />
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
      </div>
      {helperText && <p className="text-sm text-muted-foreground">{helperText}</p>}
    </div>
  )
}

export function AssetForm({ mode, initial, onSuccess, onCancel }: Props) {
  // 세부 카테고리/기관/자산군/운용전략 추천 목록은 kista-api 런타임 설정(관리자 수정 가능)이 SSOT다 —
  // 필드 자체는 여전히 자유 입력이라 설정 로딩 전에는 알려진 기본값으로 폴백한다.
  const assetFormOptions = useRuntimeConfigQuery().data?.assetFormOptions ?? DEFAULT_ASSET_FORM_OPTIONS
  const initialCategory: AssetCategory = initial?.category ?? 'INVESTMENT'
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? todayKst())
  const [category, setCategory] = useState<AssetCategory>(initialCategory)
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '')
  const [institution, setInstitution] = useState(initial?.institution ?? '')
  const [assetClass, setAssetClass] = useState(initial?.assetClass ?? (initialCategory === 'INVESTMENT' ? '' : '원화'))
  const [strategy, setStrategy] = useState(initial?.strategy ?? '')
  const [amountDigits, setAmountDigits] = useState(initial ? String(initial.amount) : '')

  const createMutation = useCreateAssetMutation()
  const updateMutation = useUpdateAssetMutation(initial?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  function handleCategoryChange(next: AssetCategory) {
    setCategory(next)
    setSubcategory('')
    // strategy는 지우지 않는다 — INVESTMENT가 아닐 때는 제출 payload에서 이미 제외되므로(아래 handleSubmit),
    // 카테고리를 다시 INVESTMENT로 되돌렸을 때 입력했던 값이 그대로 남아있는 편이 사용자 경험상 자연스럽다.
    setAssetClass(next === 'INVESTMENT' ? '' : '원화')
  }

  const canSubmit = entryDate !== '' && subcategory.trim() !== '' && assetClass.trim() !== '' && amountDigits !== ''

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return

    const payload: AssetRequest = {
      entryDate,
      category,
      subcategory: subcategory.trim(),
      institution: institution.trim() || undefined,
      assetClass: assetClass.trim(),
      strategy: category === 'INVESTMENT' ? (strategy.trim() || undefined) : undefined,
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
              items={ASSET_CATEGORIES.map((c) => ({ value: c, label: formatAssetCategoryLabel(c) }))}
              value={category}
              onValueChange={(value) => { if (value && value !== category) handleCategoryChange(value as AssetCategory) }}
            >
              <SelectTrigger id="category" className="w-full h-12" disabled={isPending}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{formatAssetCategoryLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ComboField
            id="subcategory"
            label="세부 카테고리"
            placeholder="예: 일반계좌, 정기예금, 전세자금대출"
            value={subcategory}
            onChange={setSubcategory}
            suggestions={assetFormOptions.subcategorySuggestions[category] ?? []}
            selectLabel="세부 카테고리 목록에서 선택"
            disabled={isPending}
            maxLength={100}
          />

          <ComboField
            id="institution"
            label="기관 (선택)"
            placeholder="예: 미래에셋증권, 국민은행"
            value={institution}
            onChange={setInstitution}
            suggestions={assetFormOptions.institutionSuggestions}
            selectLabel="기관 목록에서 선택"
            disabled={isPending}
            maxLength={100}
          />

          <ComboField
            id="assetClass"
            label="자산군"
            placeholder="예: 미국주식, 원화"
            value={assetClass}
            onChange={setAssetClass}
            suggestions={assetFormOptions.assetClassSuggestions}
            selectLabel="자산군 목록에서 선택"
            disabled={isPending}
            maxLength={50}
          />

          {category === 'INVESTMENT' && (
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
