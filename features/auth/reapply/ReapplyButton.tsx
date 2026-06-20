'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { reapply } from '@entities/user'
import { ApiError } from '@shared/lib/api-client'

const STORAGE_KEY = 'reapply_last_requested_at'
const COOLDOWN_MS = 60 * 60 * 1000

export function ReapplyButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState(() => {
    if (typeof window === 'undefined') return 0
    const last = localStorage.getItem(STORAGE_KEY)
    if (!last) return 0
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - Number(last))) / 60000)
    return remaining > 0 ? remaining : 0
  })

  async function handleReapply() {
    if (cooldownMinutes > 0) {
      alert(`${cooldownMinutes}분 후 다시 요청할 수 있습니다`)
      return
    }
    setIsLoading(true)
    try {
      await reapply()
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      setCooldownMinutes(60)
      toast.success('승인 재요청이 완료되었습니다')
    } catch (err) {
      toast.error(err instanceof ApiError ? '재요청에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-3">
      <Button
        variant="outline"
        size="lg"
        className="w-full h-12"
        onClick={handleReapply}
        disabled={isLoading}
      >
        {isLoading ? '요청 중...' : cooldownMinutes > 0 ? `${cooldownMinutes}분 후 재요청 가능` : '승인 재요청'}
      </Button>
    </div>
  )
}
