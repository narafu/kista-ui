'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useApproveUserMutation, useRejectUserMutation } from '@entities/admin'
import { Spinner } from '@shared/ui/Spinner'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@shared/lib/utils'

interface Props {
  userId: string
  nickname: string
}

export function ApproveRejectButtons({ userId, nickname }: Props) {
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const approveMutation = useApproveUserMutation()
  const rejectMutation = useRejectUserMutation()

  function handleApprove() {
    setAction('approve')
    approveMutation.mutate(userId, {
      onSuccess: () => toast.success(`${nickname} 승인 완료`),
      onSettled: () => setAction(null),
    })
  }

  function handleReject() {
    setAction('reject')
    rejectMutation.mutate(userId, {
      onSuccess: () => toast.success(`${nickname} 거절 완료`),
      onSettled: () => setAction(null),
    })
  }

  const loading = approveMutation.isPending || rejectMutation.isPending

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={handleApprove}
        disabled={loading}
        className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1')}
      >
        {action === 'approve' ? <><Spinner size={12} />승인 중...</> : '승인'}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={loading}
        className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
      >
        {action === 'reject' ? <><Spinner size={12} />거절 중...</> : '거절'}
      </button>
    </div>
  )
}
