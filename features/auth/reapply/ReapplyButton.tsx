'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { reapply, useMeQuery, userKeys } from '@entities/user'
import { ApiError, apiMsg } from '@shared/lib/api-client'
import { remainingCooldownMinutes } from './cooldown'

export function ReapplyButton() {
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()
  const { data: me } = useMeQuery()
  const cooldownMinutes = remainingCooldownMinutes(me?.reapplyAvailableAt)

  async function handleReapply() {
    if (cooldownMinutes > 0) {
      toast.error(`${cooldownMinutes}분 후 다시 요청할 수 있습니다`)
      return
    }
    setIsLoading(true)
    try {
      await reapply()
      await queryClient.invalidateQueries({ queryKey: userKeys.me() })
      toast.success('승인 재신청을 완료했습니다')
    } catch (err) {
      toast.error(err instanceof ApiError ? apiMsg(err, '재신청에 실패했습니다') : '오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mb-3">
      <Button
        variant="outline"
        size="form"
        className="w-full"
        onClick={handleReapply}
        disabled={isLoading}
      >
        {isLoading ? '신청 중...' : cooldownMinutes > 0 ? `${cooldownMinutes}분 후 재신청 가능` : '승인 재신청'}
      </Button>
    </div>
  )
}
