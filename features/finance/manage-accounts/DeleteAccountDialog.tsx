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
} from '@/components/ui/alert-dialog'
import { useDeleteFinanceAccountMutation } from '@entities/finance'
import type { FinanceAccount } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: FinanceAccount
}

export function DeleteAccountDialog({ open, onOpenChange, account }: Props) {
  const deleteMutation = useDeleteFinanceAccountMutation()

  function handleConfirm() {
    deleteMutation.mutate(account.id, {
      onSuccess: () => {
        toast.success('계좌가 삭제되었습니다')
        onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent size="sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{account.name} 계좌를 삭제하시겠습니까?</AlertDialogTitle>
          <AlertDialogDescription>
            이 계좌를 사용한 자산 기록은 계좌 미지정 상태로 남습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>취소</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm} disabled={deleteMutation.isPending}>
            {deleteMutation.isPending ? '삭제 중...' : '삭제'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
