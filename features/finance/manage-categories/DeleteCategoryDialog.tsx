'use client'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

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
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{categoryName} 카테고리를 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            {childCount > 0 && `하위 ${childCount}개 카테고리가 함께 삭제됩니다. `}
            이 카테고리를 사용한 과거 기록은 유지됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm} disabled={isPending}>
            {isPending ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
