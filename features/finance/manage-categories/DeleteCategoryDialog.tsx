'use client'

import { ConfirmDialog } from '@shared/ui/ConfirmDialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  categoryName: string
  /** collectSubtreeIds 결과 길이(자기 자신 포함) — 하위 카테고리 개수 안내에 사용 */
  subtreeCount: number
  onConfirm: () => void
  isPending: boolean
}

export function DeleteCategoryDialog({ open, onOpenChange, categoryName, subtreeCount, onConfirm, isPending }: Props) {
  const childCount = Math.max(subtreeCount - 1, 0)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${categoryName} 카테고리를 삭제하시겠습니까?`}
      description={`${childCount > 0 ? `하위 ${childCount}개 카테고리가 함께 삭제됩니다. ` : ''}이 카테고리를 사용한 과거 기록은 유지됩니다.`}
      pendingLabel="삭제 중..."
      onConfirm={onConfirm}
      pending={isPending}
    />
  )
}
