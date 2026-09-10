'use client'

import { useMemo, useState } from 'react'
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
import { submitFormDialog } from '@shared/lib/form/submitFormDialog'
import { SaveButton } from '@shared/ui/SaveButton'
import { ShareToGroupSwitch } from '@shared/ui/ShareToGroupSwitch'
import { getCascadeLevels, getCategoryPath, useCanShareToGroup, useCreateFinanceCategoryMutation, useUpdateFinanceCategoryMutation } from '@entities/finance'
import type { FinanceCategory, FinanceCategoryRequest, FinanceCategoryType } from '@entities/finance'

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

export function CategoryFormDialog({ open, onOpenChange, type, l1Categories, category, onSuccess }: Props) {
  const mode = category ? 'edit' : 'create'
  const [name, setName] = useState(category?.name ?? '')
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 1))
  // 계단식 부모 Select: 각 단에서 선택한 categoryId를 순서대로 담는다. 마지막 값이 실제
  // parentId — 선택한 노드에 children이 있으면 다음 단이 자동으로 추가돼 depth 제한이 없다.
  const [selectedPath, setSelectedPath] = useState<string[]>([])
  const cascadeLevels = useMemo(() => getCascadeLevels(l1Categories, selectedPath), [l1Categories, selectedPath])
  const parentId = selectedPath[selectedPath.length - 1] ?? NO_PARENT_VALUE

  // 그룹 소속일 때만 노출, 기본값 켜짐(그룹 저장 우선) — 수정 모드는 groupId가 이미 고정돼 있어 대상 아님.
  const canShareToGroup = useCanShareToGroup()
  const [shareToGroup, setShareToGroup] = useState(true)
  // 부모가 개인 소유면 그 아래 그룹 공유 카테고리를 만들 수 없다(kista-api 400 — 다른 멤버에게
  // 부모 없는 고아 트리로 보이는 것을 막음). 이 경우 토글을 숨기고 개인 소유로만 생성한다.
  const parentIsPersonal = useMemo(() => {
    if (parentId === NO_PARENT_VALUE) return false
    const parent = getCategoryPath(l1Categories, parentId).at(-1)
    return parent != null && !parent.groupId
  }, [l1Categories, parentId])
  const shareToGroupAllowed = canShareToGroup && !parentIsPersonal

  const createMutation = useCreateFinanceCategoryMutation()
  const updateMutation = useUpdateFinanceCategoryMutation(category?.id ?? '')
  const isPending = mode === 'edit' ? updateMutation.isPending : createMutation.isPending

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    // PUT은 parentId/type을 서버가 무시하지만 요청 스키마상 필수라 기존 값을 그대로 실어 보낸다.
    const payload: FinanceCategoryRequest = {
      parentId: mode === 'edit' ? category?.parentId : (parentId === NO_PARENT_VALUE ? undefined : parentId),
      type,
      name: name.trim(),
      sortOrder: Math.max(1, Math.trunc(Number(sortOrder)) || 1),
    }

    submitFormDialog({
      mode,
      payload,
      createMutation,
      updateMutation,
      createExtra: { shareToGroup: shareToGroupAllowed && shareToGroup },
      messages: { create: '카테고리가 추가되었습니다', edit: '카테고리가 수정되었습니다' },
      onSuccess,
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
                      <SelectTrigger id={levelIndex === 0 ? 'parentId' : undefined} className="w-full h-10" disabled={isPending}>
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
                min={1}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isPending}
              />
            </div>

            {mode === 'create' && shareToGroupAllowed && (
              <ShareToGroupSwitch id="categoryShareToGroup" checked={shareToGroup} onCheckedChange={setShareToGroup} disabled={isPending} />
            )}
            {mode === 'create' && canShareToGroup && parentIsPersonal && (
              <p className="text-xs text-muted-foreground">개인 카테고리 하위에는 그룹 공유 카테고리를 만들 수 없어요.</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              취소
            </Button>
            <SaveButton isPending={isPending} disabled={!name.trim()} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
