'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approveAdminUser, rejectAdminUser } from '@/lib/api/admin'
import { toast } from 'sonner'

interface Props {
  userId: string
  nickname: string
}

export function ApproveRejectButtons({ userId, nickname }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null)

  async function handleApprove() {
    setLoading('approve')
    try {
      await approveAdminUser(userId)
      toast.success(`${nickname} 승인 완료`)
      router.refresh()
    } catch {
      toast.error('승인 실패')
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading('reject')
    try {
      await rejectAdminUser(userId)
      toast.success(`${nickname} 거절 완료`)
      router.refresh()
    } catch {
      toast.error('거절 실패')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleApprove}
        disabled={loading !== null}
        className="px-3 py-1.5 text-xs font-semibold rounded-md bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
      >
        {loading === 'approve' ? '...' : '승인'}
      </button>
      <button
        onClick={handleReject}
        disabled={loading !== null}
        className="px-3 py-1.5 text-xs font-semibold rounded-md border border-border text-muted-foreground hover:bg-muted disabled:opacity-50 transition-colors"
      >
        {loading === 'reject' ? '...' : '거절'}
      </button>
    </div>
  )
}
