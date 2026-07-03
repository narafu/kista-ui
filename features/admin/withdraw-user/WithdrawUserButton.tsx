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
          className="px-2.5 py-1 text-xs font-semibold rounded-md border border-[var(--status-error)]/50 text-[var(--status-error)] hover:bg-[var(--status-error-bg)] disabled:opacity-50 transition-colors"
        >
          탈퇴
        </AlertDialogTrigger>
      </div>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-[var(--status-error)]">회원 강제 탈퇴</AlertDialogTitle>
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
            className="bg-[var(--status-error)] text-white hover:opacity-90 disabled:opacity-60"
          >
            {mutation.isPending ? '처리 중...' : '탈퇴 처리'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
