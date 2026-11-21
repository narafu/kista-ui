'use client'

import { ConfirmDialog } from '@shared/ui/ConfirmDialog'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  isPending: boolean
  onConfirm: () => void
}

// 1인 1그룹 정책으로 개인 그룹 개념 자체가 사라져 GroupSection은 실제 그룹에 소속된 경우에만
// 렌더된다 — 이 다이얼로그도 항상 실제 그룹 탈퇴 상황에서만 열린다.
// 탈퇴해도 그룹에 공유한 데이터의 group_id는 이관되지 않는다(kista-api leaveGroup) —
// 본인은 더 이상 조회할 수 없고 남은 멤버는 계속 조회한다.
export function LeaveGroupDialog({ open, onOpenChange, isPending, onConfirm }: Props) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="그룹에서 탈퇴하시겠습니까?"
      description="탈퇴하면 이 그룹에 공유한 데이터를 더 이상 볼 수 없습니다. 데이터 자체는 삭제되지 않고 남은 멤버가 계속 볼 수 있습니다."
      confirmLabel="탈퇴"
      pendingLabel="탈퇴"
      onConfirm={onConfirm}
      pending={isPending}
    />
  )
}
