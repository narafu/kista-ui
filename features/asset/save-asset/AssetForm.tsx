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
import { ASSET_CATEGORIES, KNOWN_ASSET_CLASSES, useCreateAssetMutation, useUpdateAssetMutation } from '@entities/asset'
import type { Asset, AssetCategory, AssetRequest } from '@entities/asset'

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

export function AssetForm({ mode, initial, onSuccess, onCancel }: Props) {
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

          <div className="space-y-2">
            <Label htmlFor="subcategory">세부 구분</Label>
            <Input
              id="subcategory"
              placeholder="예: 일반계좌, 정기예금, 전세자금대출"
              value={subcategory}
              onChange={(e) => setSubcategory(e.target.value)}
              disabled={isPending}
              maxLength={100}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="institution">기관 (선택)</Label>
            <Input
              id="institution"
              placeholder="예: 미래에셋증권, 국민은행"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
              disabled={isPending}
              maxLength={100}
              className="h-12"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetClass">자산군</Label>
            <div className="flex gap-2">
              <Input
                id="assetClass"
                placeholder="예: 미국주식, 원화"
                value={assetClass}
                onChange={(e) => setAssetClass(e.target.value)}
                disabled={isPending}
                maxLength={50}
                className="h-12 flex-1"
              />
              <Select
                items={KNOWN_ASSET_CLASSES.map((c) => ({ value: c, label: c }))}
                onValueChange={(value: string | null) => { if (value) setAssetClass(value) }}
              >
                <SelectTrigger aria-label="자산군 목록에서 선택" className="w-32 h-12 shrink-0" disabled={isPending}>
                  <SelectValue>목록</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {KNOWN_ASSET_CLASSES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {category === 'INVESTMENT' && (
            <div className="space-y-2">
              <Label htmlFor="strategy">운용전략 (선택)</Label>
              <Input
                id="strategy"
                placeholder="예: VR, 자유 메모"
                value={strategy}
                onChange={(e) => setStrategy(e.target.value)}
                disabled={isPending}
                maxLength={50}
                className="h-12"
              />
              <p className="text-sm text-muted-foreground">자동매매 전략과 무관한 자유 메모입니다.</p>
            </div>
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
