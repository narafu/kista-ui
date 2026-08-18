'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Spinner } from '@shared/ui/Spinner'
import { useCreateFinanceCategoryMutation, useUpdateFinanceCategoryMutation } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'

// Base UI Select는 빈 문자열 value를 허용하지 않는다 — AssetForm의 NO_ACCOUNT_VALUE와 동일한 센티널 패턴.
const NO_PARENT_VALUE = 'NONE'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  /** 부모 선택지(L1 카테고리 목록) — 생성 모드에서만 사용, UI는 L1/L2 2단만 지원한다 */
  l1Categories: FinanceCategory[]
  /** null이면 생성 모드, 값이 있으면 수정 모드(name·sortOrder만 편집 가능) */
  category: FinanceCategory | null
  onSuccess: () => void
}

export function CategoryFormDialog({ open, onOpenChange, type, l1Categories, category, onSuccess }: Props) {
  const mode = category ? 'edit' : 'create'
  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0))
  const [parentId, setParentId] = useState(category?.parentId ?? NO_PARENT_VALUE)

  const createMutation = useCreateFinanceCategoryMutation()
  const updateMutation = useUpdateFinanceCategoryMutation(category?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // PUT은 parentId/type을 서버가 무시하지만 요청 스키마상 필수라 기존 값을 그대로 실어 보낸다.
    const payload = {
      parentId: mode === 'edit' ? category?.parentId : (parentId === NO_PARENT_VALUE ? undefined : parentId),
      type,
      name: name.trim(),
      sortOrder: Number(sortOrder) || 0,
    }

    if (mode === 'edit') {
      updateMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('카테고리가 수정되었습니다')
          onSuccess()
        },
      })
      return
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('카테고리가 추가되었습니다')
        onSuccess()
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{mode === 'edit' ? '카테고리 수정' : '카테고리 추가'}</DialogTitle>
            <DialogDescription>
              {mode === 'edit' ? '이름과 정렬순서만 수정할 수 있습니다.' : '새 카테고리를 추가합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="parentId">상위 카테고리</Label>
                <Select
                  items={[
                    { value: NO_PARENT_VALUE, label: '없음 (최상위로 생성)' },
                    ...l1Categories.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                  value={parentId}
                  onValueChange={(value) => { if (value) setParentId(value) }}
                >
                  <SelectTrigger id="parentId" className="w-full h-10" disabled={isPending}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PARENT_VALUE}>없음 (최상위로 생성)</SelectItem>
                    {l1Categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="categoryName">이름</Label>
              <Input
                id="categoryName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="categorySortOrder">정렬순서</Label>
              <Input
                id="categorySortOrder"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()} className="gap-2">
              {isPending ? (<><Spinner size={14} />저장 중...</>) : '저장'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
