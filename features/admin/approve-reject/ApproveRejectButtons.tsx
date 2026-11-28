'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useApproveUserMutation, useRejectUserMutation } from '@entities/admin'
import { blockTriggerWhile } from '@shared/ui/blockTriggerWhile'
import { ConfirmDialog } from '@shared/ui/ConfirmDialog'
import { Spinner } from '@shared/ui/Spinner'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'

interface Props {
  userId: string
  nickname: string
}

export function ApproveRejectButtons({ userId, nickname }: Props) {
  const [openDialog, setOpenDialog] = useState<'approve' | 'reject' | null>(null)
  const approveMutation = useApproveUserMutation()
  const rejectMutation = useRejectUserMutation()

  const loading = approveMutation.isPending || rejectMutation.isPending

  // disabled로 바꾸면 확인 후 포커스가 body로 빠져 트리거로 복귀하지 못한다 — aria-disabled + 열기 차단
  const blockWhileLoading = blockTriggerWhile(loading)

  return (
    <div className="flex gap-2">
      <ConfirmDialog
        trigger={
          <button
            type="button"
            aria-disabled={loading}
            onClick={blockWhileLoading}
            className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1')}
          >
            {approveMutation.isPending ? <><Spinner size={12} />승인 중…</> : '승인'}
          </button>
        }
        open={openDialog === 'approve'}
        onOpenChange={(next) => setOpenDialog(next ? 'approve' : null)}
        size="default"
        destructive={false}
        title="가입을 승인하시겠습니까?"
        description={`${nickname} 님을 승인합니다. 승인 즉시 서비스 이용이 시작됩니다.`}
        confirmLabel="승인"
        mutation={approveMutation}
        variables={userId}
        onSuccess={() => toast.success(`${nickname} 님을 승인했습니다`)}
      />
      <ConfirmDialog
        trigger={
          <button
            type="button"
            aria-disabled={loading}
            onClick={blockWhileLoading}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
          >
            {rejectMutation.isPending ? <><Spinner size={12} />거절 중…</> : '거절'}
          </button>
        }
        open={openDialog === 'reject'}
        onOpenChange={(next) => setOpenDialog(next ? 'reject' : null)}
        size="default"
        title="가입을 거절하시겠습니까?"
        description={`${nickname} 님의 가입 신청을 거절합니다.`}
        confirmLabel="거절"
        mutation={rejectMutation}
        variables={userId}
        onSuccess={() => toast.success(`${nickname} 님의 가입을 거절했습니다`)}
      />
    </div>
  )
}
