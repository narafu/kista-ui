'use client'

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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import { useRemoveFinanceGroupMemberMutation } from '@entities/finance'
import type { FinanceGroupMember } from '@entities/finance'

// nickname은 kista-api가 아직 내려주지 않는다(entities/finance/model/types.ts 참고) —
// 항상 userId 앞 8자로 폴백해 렌더한다. 서버가 나중에 채워주기 시작하면 이 폴백은 자동으로
// 안 쓰이게 되므로 지금 손댈 필요 없다.
function memberLabel(member: FinanceGroupMember) {
  return member.nickname ?? member.userId.slice(0, 8)
}

function KickMemberButton({ groupId, member }: { groupId: string; member: FinanceGroupMember }) {
  const mutation = useRemoveFinanceGroupMemberMutation(groupId)
  const label = memberLabel(member)

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={mutation.isPending}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
      >
        추방
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{label}님을 추방하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>추방된 멤버의 데이터는 본인의 개인 그룹으로 이관됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate(member.userId, { onSuccess: () => toast.success(`${label}님을 추방했습니다`) })}
          >
            {mutation.isPending ? '처리 중...' : '추방'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

interface Props {
  groupId: string
  members: FinanceGroupMember[]
  isPersonal: boolean
  isOwner: boolean
  myUserId?: string
}

export function GroupMemberList({ groupId, members, isPersonal, isOwner, myUserId }: Props) {
  const showKick = isOwner && !isPersonal

  return (
    <div className="space-y-2">
      {members.map((member) => (
        <div key={member.userId} className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="truncate">{memberLabel(member)}</span>
            <span className="text-xs rounded-full bg-muted px-2 py-0.5 text-muted-foreground shrink-0">{member.role}</span>
            {member.userId === myUserId && (
              <span className="text-xs rounded-full bg-primary/10 px-2 py-0.5 text-primary shrink-0">나</span>
            )}
          </div>
          {showKick && member.userId !== myUserId && <KickMemberButton groupId={groupId} member={member} />}
        </div>
      ))}
    </div>
  )
}
