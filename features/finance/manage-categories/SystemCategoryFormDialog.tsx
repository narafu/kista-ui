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
import { getCascadeLevels, useCreateSystemFinanceCategoryMutation, useUpdateSystemFinanceCategoryMutation } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryType } from '@entities/finance'

// Base UI Select는 빈 문자열 value를 허용하지 않는다 — AssetForm의 NO_ACCOUNT_VALUE와 동일한 센티널 패턴.
const NO_PARENT_VALUE = 'NONE'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: FinanceCategoryType
  /** 부모 선택지 — 생성 모드에서만 사용, 루트 트리(children 포함) 전체를 받아 임의 depth 계단식 선택을 구성한다 */
  l1Categories: FinanceCategory[]
  /** null이면 생성 모드, 값이 있으면 수정 모드(name·sortOrder만 편집 가능) */
  category: FinanceCategory | null
  onSuccess: () => void
}

// CategoryFormDialog와 거의 동일하되 관리자 전용 시스템 카테고리 mutation을 사용한다.
export function SystemCategoryFormDialog({ open, onOpenChange, type, l1Categories, category, onSuccess }: Props) {
  const mode = category ? 'edit' : 'create'
  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0))
  // 계단식 부모 Select: 각 단에서 선택한 categoryId를 순서대로 담는다. 마지막 값이 실제
  // parentId — 선택한 노드에 children이 있으면 다음 단이 자동으로 추가돼 depth 제한이 없다.
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const cascadeLevels = getCascadeLevels(l1Categories, selectedPath)
  const parentId = selectedPath[selectedPath.length - 1] ?? NO_PARENT_VALUE

  const createMutation = useCreateSystemFinanceCategoryMutation()
  const updateMutation = useUpdateSystemFinanceCategoryMutation(category?.id ?? '')
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
            <DialogTitle>{mode === 'edit' ? '가계부 공통카테고리 수정' : '가계부 공통카테고리 추가'}</DialogTitle>
            <DialogDescription>
              {mode === 'edit' ? '이름과 정렬순서만 수정할 수 있습니다.' : '모든 그룹에 공통으로 노출되는 카테고리를 추가합니다.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {mode === 'create' && (
              <div className="space-y-2">
                <Label htmlFor="systemCategoryParentId">상위 카테고리</Label>
                <div className="space-y-2">
                  {cascadeLevels.map((level, levelIndex) => (
                    <Select
                      key={levelIndex}
                      items={[
                        { value: NO_PARENT_VALUE, label: '없음 (최상위로 생성)' },
                        ...level.map((c) => ({ value: c.id, label: c.name })),
                      ]}
                      value={selectedPath[levelIndex] ?? NO_PARENT_VALUE}
                      onValueChange={(value) => {
                        if (!value) return
                        setSelectedPath((prev) => (value === NO_PARENT_VALUE ? prev.slice(0, levelIndex) : [...prev.slice(0, levelIndex), value]))
                      }}
                    >
                      <SelectTrigger id={levelIndex === 0 ? 'systemCategoryParentId' : undefined} className="w-full h-10" disabled={isPending}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NO_PARENT_VALUE}>없음 (최상위로 생성)</SelectItem>
                        {level.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="systemCategoryName">이름</Label>
              <Input
                id="systemCategoryName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="systemCategorySortOrder">정렬순서</Label>
              <Input
                id="systemCategorySortOrder"
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
