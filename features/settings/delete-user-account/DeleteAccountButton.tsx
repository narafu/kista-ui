'use client'

import { useState } from 'react'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'
import { blockTriggerWhile } from '@shared/ui/blockTriggerWhile'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { useDeleteMeMutation } from '@entities/user'

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false)
  // 성공 뒤 이동하기 전까지 다이얼로그가 열려 있어 확인이 다시 눌리지 않게 잠근다. 실패하면 켜지지 않는다
  const [leaving, setLeaving] = useState(false)
  const mutation = useDeleteMeMutation()

  async function handleDelete() {
    try {
      await mutation.mutateAsync()
      setLeaving(true)
      window.location.href = '/'
    } catch {
      // 실패 토스트는 useDeleteMeMutation의 onError가 띄운다
    }
  }

  const blocked = mutation.isPending || leaving

  return (
    <>
      <ConfirmDialog
        trigger={
          <button type="button" aria-disabled={blocked} onClick={blockTriggerWhile(blocked)} className={cn(buttonVariants({ variant: 'destructive' }), 'aria-disabled:opacity-50')}>
            회원 탈퇴
          </button>
        }
        open={open}
        onOpenChange={setOpen}
        size="default"
        title={<span className="text-destructive">정말 탈퇴하시겠습니까?</span>}
        description="모든 계좌, 거래 내역, 설정이 즉시 삭제되며 복구할 수 없습니다."
        confirmLabel="탈퇴 확인"
        pendingLabel="처리 중…"
        onConfirm={handleDelete}
        pending={blocked}
      />
      <p className="text-sm text-muted-foreground mt-2">
        탈퇴 시 모든 계좌, 거래 내역, 설정이 즉시 삭제됩니다.
      </p>
    </>
  )
}
