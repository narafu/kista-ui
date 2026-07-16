'use client'

import { useState } from 'react'
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
      <AlertDialog>
        <AlertDialogTrigger
          disabled={loading}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1')}
        >
          {action === 'reject' ? <><Spinner size={12} />거절 중...</> : '거절'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입을 거절하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${nickname} 님의 가입 신청을 거절합니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleReject} disabled={loading} variant="destructive">
              거절
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
