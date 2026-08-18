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
  isPersonal: boolean
  isPending: boolean
  onConfirm: () => void
}

// 개인 그룹(personal:true) 탈퇴는 kista-api가 409로 거부한다 — 호출부(GroupSection)가
// isPersonal이면 트리거 버튼 자체를 렌더하지 않지만, 이 다이얼로그도 isPersonal이면 렌더
// 자체를 거부하는 이중 방어를 유지한다. 트리거 게이팅만 믿으면 향후 새 호출부가 그 체크를
// 빠뜨렸을 때 개인 그룹에 대해 실제로 탈퇴 확인창이 뜨고 뮤테이션까지 발사될 수 있다.
export function LeaveGroupDialog({ open, onOpenChange, isPersonal, isPending, onConfirm }: Props) {
  if (isPersonal) return null

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>그룹에서 탈퇴하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>탈퇴하면 이 그룹에서 소유한 데이터가 내 개인 그룹으로 이관됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={onConfirm}>
            탈퇴
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
