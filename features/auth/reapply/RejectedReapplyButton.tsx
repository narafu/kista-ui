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
  const [cooldownMinutes, setCooldownMinutes] = useState(() => {
    if (typeof window === 'undefined') return 0
    const last = localStorage.getItem(STORAGE_KEY)
    if (!last) return 0
    const remaining = Math.ceil((COOLDOWN_MS - (Date.now() - Number(last))) / 60000)
    return remaining > 0 ? remaining : 0
  })

  async function handleReapply() {
    if (cooldownMinutes > 0) return
    setErrorMessage(null)
    try {
      await reapply()
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
      router.push('/pending')
    } catch {
      setErrorMessage('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
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
        disabled={cooldownMinutes > 0}
        className="w-full h-[52px] rounded-xl text-[15px] font-bold border-0 cursor-pointer disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground bg-primary text-white"
      >
        {cooldownMinutes > 0 ? formatCooldown(cooldownMinutes) : '승인 재신청'}
      </button>
      <div className="text-[11.5px] text-muted-foreground mt-2.5 text-center">
        재신청은 24시간에 한 번만 가능합니다.
      </div>
    </>
  )
}
