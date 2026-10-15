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
      onSuccess: () => toast.success(`${nickname} 님을 승인했습니다`),
      onSettled: () => setAction(null),
    })
  }

  function handleReject() {
    setAction('reject')
    rejectMutation.mutate(userId, {
      onSuccess: () => toast.success(`${nickname} 님의 가입을 거절했습니다`),
      onSettled: () => setAction(null),
    })
  }

  const loading = approveMutation.isPending || rejectMutation.isPending

  // disabled로 바꾸면 확인 후 포커스가 body로 빠져 트리거로 복귀하지 못한다 — aria-disabled + 열기 차단
  function blockWhileLoading(e: { preventBaseUIHandler: () => void }) {
    if (loading) e.preventBaseUIHandler()
  }

  return (
    <div className="flex gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          aria-disabled={loading}
          onClick={blockWhileLoading}
          className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-1 aria-disabled:opacity-50')}
        >
          {action === 'approve' ? <><Spinner size={12} />승인 중...</> : '승인'}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>가입을 승인하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              {`${nickname} 님을 승인합니다. 승인 즉시 서비스 이용이 시작됩니다.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={loading}>
              승인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog>
        <AlertDialogTrigger
          aria-disabled={loading}
          onClick={blockWhileLoading}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1 aria-disabled:opacity-50')}
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
