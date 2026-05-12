'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { reapply } from '@/lib/api/auth'
import { ApiError } from '@/lib/api/client'

const STORAGE_KEY = 'reapply_last_requested_at'
const COOLDOWN_MS = 60 * 60 * 1000 // 1시간

export function ReapplyButton() {
  const [isLoading, setIsLoading] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(0)

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      const elapsed = Date.now() - Number(last)
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
      if (remaining > 0) setCooldownMinutes(remaining)
    }
  }, [])

  async function handleClick() {
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
        onClick={handleClick}
        disabled={isLoading}
      >
        {isLoading ? '요청 중...' : cooldownMinutes > 0 ? `${cooldownMinutes}분 후 재요청 가능` : '승인 재요청'}
      </Button>
    </div>
  )
}
