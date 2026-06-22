'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { reapply } from '@entities/user'

const STORAGE_KEY = 'reapply_rejected_last_at'
const COOLDOWN_MS = 24 * 60 * 60 * 1000

function formatCooldown(minutes: number): string {
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}시간 ${m}분 후 재신청 가능` : `${h}시간 후 재신청 가능`
  }
  return `${minutes}분 후 재신청 가능`
}

export function RejectedReapplyButton() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cooldownMinutes, setCooldownMinutes] = useState(() => {
    if (typeof window === 'undefined') return 0
    const last = localStorage.getItem(STORAGE_KEY)
    if (!last) return 0
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - Number(last))) / 60000)
    return remaining > 0 ? remaining : 0
  })

  async function handleReapply() {
    if (cooldownMinutes > 0 || isLoading) return
    setErrorMessage(null)
    setIsLoading(true)
    try {
      await reapply()
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      router.push('/pending')
    } catch {
      setErrorMessage('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      setIsLoading(false)
    }
  }

  return (
    <>
      {errorMessage && (
        <p className="text-[13px] text-destructive text-center mb-3">
          {errorMessage}
        </p>
      )}
      <button
        type="button"
        onClick={handleReapply}
        disabled={cooldownMinutes > 0 || isLoading}
        className="w-full h-[52px] rounded-xl text-[15px] font-bold border-0 cursor-pointer disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground bg-primary text-white inline-flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            재신청 중...
          </>
        ) : (cooldownMinutes > 0 ? formatCooldown(cooldownMinutes) : '승인 재신청')}
      </button>
      <div className="text-[11.5px] text-muted-foreground mt-2.5 text-center">
        재신청은 24시간에 한 번만 가능합니다.
      </div>
    </>
  )
}
