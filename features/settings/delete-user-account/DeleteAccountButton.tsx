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
import { useDeleteMeMutation } from '@entities/user'

export function DeleteAccountButton() {
  const mutation = useDeleteMeMutation()

  async function handleDelete() {
    try {
      await mutation.mutateAsync()
      window.location.href = '/'
    } catch {
      toast.error('탈퇴 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger className="px-4 py-2 rounded-[var(--r-md)] border border-neg/50 text-neg text-sm font-semibold hover:bg-neg/5 transition-colors">
          회원 탈퇴
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-neg">정말 탈퇴하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              모든 계좌, 거래 내역, 설정이 즉시 삭제되며 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={mutation.isPending}
              className="bg-neg text-white hover:bg-neg/90 disabled:opacity-60"
            >
              {mutation.isPending ? '처리 중...' : '탈퇴 확인'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <p className="text-sm text-muted-foreground mt-2">
        탈퇴 시 모든 계좌·거래 데이터가 즉시 삭제됩니다
      </p>
    </>
  )
}
