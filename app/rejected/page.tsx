'use client'

import { useState } from 'react'
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

export default function RejectedPage() {
  const router = useRouter()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleReapply() {
    setErrorMessage(null)
    try {
      const res = await fetch('/api/auth/reapply-done', { method: 'POST' })
      if (res.ok) {
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
            다시 가입 신청하기
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
