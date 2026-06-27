'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useApproveUserMutation, useRejectUserMutation } from '@entities/user'
import { Spinner } from '@shared/ui/Spinner'

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
      onError: () => toast.error('승인 실패'),
      onSettled: () => setAction(null),
    })
  }

  function handleReject() {
    setAction('reject')
    rejectMutation.mutate(userId, {
      onSuccess: () => toast.success(`${nickname} 거절 완료`),
      onError: () => toast.error('거절 실패'),
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
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
      >
        {action === 'approve' ? <><Spinner size={12} />승인 중...</> : '승인'}
      </button>
      <button
        type="button"
        onClick={handleReject}
        disabled={loading}
        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        {action === 'reject' ? <><Spinner size={12} />거절 중...</> : '거절'}
      </button>
    </div>
  )
}
