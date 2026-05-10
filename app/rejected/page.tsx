'use client'

import { useState, useEffect } from 'react'
import { XCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const STORAGE_KEY = 'reapply_rejected_last_at'
const COOLDOWN_MS = 24 * 60 * 60 * 1000 // 24시간

function formatCooldown(minutes: number): string {
  if (minutes > 60) {
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    return m > 0 ? `${h}시간 ${m}분 후 재신청 가능` : `${h}시간 후 재신청 가능`
  }
  return `${minutes}분 후 재신청 가능`
}

export default function RejectedPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(0)

  useEffect(() => {
    const last = localStorage.getItem(STORAGE_KEY)
    if (last) {
      const elapsed = Date.now() - Number(last)
      const remaining = Math.ceil((COOLDOWN_MS - elapsed) / 60000)
      if (remaining > 0) setCooldownMinutes(remaining)
    }
  }, [])

  async function handleReapply() {
    if (cooldownMinutes > 0) {
      alert(formatCooldown(cooldownMinutes).replace('가능', '있습니다'))
      return
    }
    setErrorMessage(null)
    try {
      const res = await fetch('/api/auth/reapply-done', { method: 'POST' })
      if (res.ok) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        router.push('/pending')
      } else {
        setErrorMessage('재신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } catch {
      setErrorMessage('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm text-center shadow-lg">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-red-100 p-4">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-xl">가입이 거절되었습니다</CardTitle>
          <CardDescription className="text-sm leading-relaxed">
            관리자가 가입 신청을 거절했습니다.<br />
            재신청하거나 관리자에게 문의해 주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
          <Button size="lg" className="w-full h-12" onClick={handleReapply}>
            {cooldownMinutes > 0 ? formatCooldown(cooldownMinutes) : '다시 가입 신청하기'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
