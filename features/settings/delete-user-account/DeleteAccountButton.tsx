'use client'

import { buttonVariants } from '@/components/ui/button-variants'
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
import { useDeleteMeMutation } from '@entities/user'

export function DeleteAccountButton() {
  const mutation = useDeleteMeMutation()

  async function handleDelete() {
    try {
      await mutation.mutateAsync()
      window.location.href = '/'
    } catch {
      // 실패 토스트는 useDeleteMeMutation의 onError가 띄운다
    }
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger className={buttonVariants({ variant: 'destructive' })}>
          회원 탈퇴
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">정말 탈퇴하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              모든 계좌, 거래 내역, 설정이 즉시 삭제되며 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={mutation.isPending}
              variant="destructive"
            >
              {mutation.isPending ? '처리 중...' : '탈퇴 확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-sm text-muted-foreground mt-2">
        탈퇴 시 모든 계좌, 거래 내역, 설정이 즉시 삭제됩니다.
      </p>
    </>
  )
}
