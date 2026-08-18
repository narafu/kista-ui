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
import { useActiveGroupId, useRemoveFinanceGroupMemberMutation, useSetActiveGroupId } from '@entities/finance'

interface Props {
  groupId: string
  isPersonal: boolean
  myUserId: string
}

// 개인 그룹(personal:true) 탈퇴는 kista-api가 409로 거부한다 — 버튼 자체를 렌더하지 않는다.
export function LeaveGroupDialog({ groupId, isPersonal, myUserId }: Props) {
  const mutation = useRemoveFinanceGroupMemberMutation(groupId)
  const activeGroupId = useActiveGroupId()
  const setActiveGroupId = useSetActiveGroupId()

  if (isPersonal) return null

  function handleLeave() {
    mutation.mutate(myUserId, {
      onSuccess: () => {
        toast.success('그룹에서 탈퇴했습니다')
        // 지금 보고 있던 그룹에서 탈퇴하면 존재하지 않는 그룹을 계속 조회하지 않도록 개인 그룹으로 되돌린다.
        if (activeGroupId === groupId) setActiveGroupId(undefined)
      },
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        disabled={mutation.isPending}
        className={cn(buttonVariants({ variant: 'outline' }), 'text-destructive hover:text-destructive border-destructive/40')}
      >
        {mutation.isPending ? '처리 중...' : '그룹 탈퇴'}
      </AlertDialogTrigger>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>그룹에서 탈퇴하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>탈퇴하면 이 그룹에서 소유한 데이터가 내 개인 그룹으로 이관됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={mutation.isPending} onClick={handleLeave}>
            탈퇴
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
