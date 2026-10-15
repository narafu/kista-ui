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
import { useDeleteAdminUserMutation } from '@entities/admin'

interface Props {
  userId: string
  nickname: string
  isSelf?: boolean
}

export function WithdrawUserButton({ userId, nickname, isSelf = false }: Props) {
  const mutation = useDeleteAdminUserMutation()

  function handleConfirm() {
    mutation.mutate(userId, {
      onSuccess: () => toast.success(`${nickname} 님을 탈퇴 처리했습니다`),
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        // 본인 행은 영구 비활성(disabled), 처리 중에는 포커스 유실을 막기 위해 aria-disabled로 연다
        disabled={isSelf}
        aria-disabled={mutation.isPending}
        aria-describedby={isSelf ? `self-withdraw-${userId}` : undefined}
        onClick={(e) => { if (mutation.isPending) e.preventBaseUIHandler() }}
        className={cn(buttonVariants({ variant: 'destructive', size: 'xs' }), 'aria-disabled:opacity-50')}
      >
        탈퇴
      </AlertDialogTrigger>
      {isSelf && (
        <span id={`self-withdraw-${userId}`} className="sr-only">본인 계정은 탈퇴 처리할 수 없습니다</span>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--status-error)]">회원을 탈퇴 처리하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            <strong className="font-semibold text-foreground">{nickname}</strong> 회원을 탈퇴 처리합니다.{' '}
            계좌·전략·거래 데이터가 즉시 삭제되며 복구할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={mutation.isPending}
            variant="destructive"
          >
            {mutation.isPending ? '처리 중...' : '탈퇴 처리'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
