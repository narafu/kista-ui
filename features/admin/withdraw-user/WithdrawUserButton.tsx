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
import { useDeleteAdminUserMutation } from '@entities/user'

interface Props {
  userId: string
  nickname: string
  isSelf?: boolean
}

export function WithdrawUserButton({ userId, nickname, isSelf = false }: Props) {
  const mutation = useDeleteAdminUserMutation()

  function handleConfirm() {
    mutation.mutate(userId, {
      onError: () => toast.error('회원 탈퇴에 실패했습니다. 잠시 후 다시 시도하세요.'),
    })
  }

  return (
    <AlertDialog>
      <div title={isSelf ? '본인 계정은 관리자 목록에서 탈퇴 처리할 수 없습니다.' : undefined}>
        <AlertDialogTrigger
          disabled={isSelf || mutation.isPending}
          className={cn(buttonVariants({ variant: 'destructive', size: 'xs' }))}
        >
          탈퇴
        </AlertDialogTrigger>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--status-error)]">회원을 강제 탈퇴시키겠습니까?</AlertDialogTitle>
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
