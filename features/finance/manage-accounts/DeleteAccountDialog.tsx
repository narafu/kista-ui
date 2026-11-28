'use client'

import { toast } from 'sonner'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { useDeleteFinanceAccountMutation } from '@entities/finance'
import type { FinanceAccount } from '@entities/finance'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  account: FinanceAccount
}

export function DeleteAccountDialog({ open, onOpenChange, account }: Props) {
  const deleteMutation = useDeleteFinanceAccountMutation()

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${account.name} 계좌를 삭제하시겠습니까?`}
      description="이 계좌를 사용한 자산 기록이 있으면 삭제할 수 없습니다. 먼저 해당 기록의 계좌 매핑을 해제해주세요."
      mutation={deleteMutation}
      variables={account.id}
      onSuccess={() => toast.success('계좌를 삭제했습니다')}
    />
  )
}
