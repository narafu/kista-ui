'use client'

import { useState } from 'react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@shared/ui/Badge'
import { useRemoveFinanceGroupMemberMutation } from '@entities/finance'
import type { FinanceGroupMember } from '@entities/finance'

// nickname은 kista-api가 아직 내려주지 않는다(entities/finance/model/types.ts 참고) —
// 항상 userId 앞 8자로 폴백해 렌더한다. 서버가 나중에 채워주기 시작하면 이 폴백은 자동으로
// 안 쓰이게 되므로 지금 손댈 필요 없다.
function memberLabel(member: FinanceGroupMember) {
  return member.nickname ?? member.userId.slice(0, 8)
}

// kista-api가 role을 OWNER/MEMBER 코드로 내려준다 — 화면에는 원문 대신 이 라벨을 쓴다(미지 코드는 원문 폴백).
const GROUP_ROLE_LABEL: Record<string, string> = { OWNER: '소유자', MEMBER: '멤버' }

// features/finance/manage-categories·manage-accounts의 삭제 확인 다이얼로그와 동일하게
// 목록이 open state를 소유하고 다이얼로그는 순수 controlled 프레젠테이션만 담당한다.
function KickMemberDialog({
  open,
  onOpenChange,
  member,
  isPending,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: FinanceGroupMember | null
  isPending: boolean
  onConfirm: () => void
}) {
  const label = member ? memberLabel(member) : ''
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{label}님을 추방하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>추방된 멤버는 이 그룹의 데이터에 더 이상 접근할 수 없습니다. 기존 데이터는 삭제되지 않고 남은 멤버가 계속 볼 수 있습니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? '처리 중...' : '추방'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface Props {
  groupId: string
  members: FinanceGroupMember[]
  isOwner: boolean
  myUserId?: string
}

export function GroupMemberList({ groupId, members, isOwner, myUserId }: Props) {
  const [kickTarget, setKickTarget] = useState<FinanceGroupMember | null>(null)
  const mutation = useRemoveFinanceGroupMemberMutation(groupId)

  function handleConfirmKick() {
    if (!kickTarget) return
    const label = memberLabel(kickTarget)
    mutation.mutate(kickTarget.userId, {
      onSuccess: () => {
        toast.success(`${label}님을 추방했습니다`)
        setKickTarget(null)
      },
    })
  }

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{memberLabel(member)}</span>
            <Badge tone="neutral">{GROUP_ROLE_LABEL[member.role] ?? member.role}</Badge>
            {member.userId === myUserId && <Badge tone="brand">나</Badge>}
          </div>
          {isOwner && member.userId !== myUserId && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setKickTarget(member)}
              disabled={mutation.isPending}
              focusableWhenDisabled
            >
              추방
            </Button>
          )}
        </div>
      ))}

      <KickMemberDialog
        open={kickTarget !== null}
        onOpenChange={(next) => { if (!next) setKickTarget(null) }}
        member={kickTarget}
        isPending={mutation.isPending}
        onConfirm={handleConfirmKick}
      />
    </div>
  )
}
