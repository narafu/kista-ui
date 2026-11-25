'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useQueryClient } from '@tanstack/react-query'
import { reapply, userKeys } from '@entities/user'
import { apiMsg } from '@shared/lib/api-client'
import { Spinner } from '@shared/ui/Spinner'
import { remainingCooldownMinutes } from './cooldown'

function formatCooldown(minutes: number): string {
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}시간 ${m}분 후 재신청 가능` : `${h}시간 후 재신청 가능`
  }
  return `${minutes}분 후 재신청 가능`
}

export function RejectedReapplyButton({ reapplyAvailableAt }: { reapplyAvailableAt?: string | null }) {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const queryClient = useQueryClient()
  const cooldownMinutes = remainingCooldownMinutes(reapplyAvailableAt)

  async function handleReapply() {
    if (cooldownMinutes > 0 || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)
    try {
      await reapply()
      await queryClient.invalidateQueries({ queryKey: userKeys.me() })
      router.push('/pending')
    } catch (err) {
      setErrorMessage(apiMsg(err, '재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'))
      setIsLoading(false)
    }
  }

  return (
    <>
      {errorMessage && (
        <p className="text-sm text-destructive text-center mb-3">
          {errorMessage}
        </p>
      )}
      <Button
        type="button"
        size="form"
        className="w-full"
        onClick={handleReapply}
        disabled={cooldownMinutes > 0 || isLoading}
      >
        {isLoading ? (
          <><Spinner size={18} />재신청 중...</>
        ) : (cooldownMinutes > 0 ? formatCooldown(cooldownMinutes) : '승인 재신청')}
      </Button>
      <div className="text-sm text-muted-foreground mt-2.5 text-center">
        재신청은 24시간에 한 번만 가능합니다.
      </div>
    </>
  )
}
