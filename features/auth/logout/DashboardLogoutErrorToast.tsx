'use client'

import { Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'

const ERROR_MESSAGES: Record<string, string> = {
  token_blacklisted: '로그아웃된 토큰입니다. 다시 로그인해 주세요.',
}

function DashboardLogoutErrorToastContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  useEffect(() => {
    if (!error) return
    toast.error(ERROR_MESSAGES[error] ?? '세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.')
    router.replace('/dashboard')
  }, [error, router])

  return null
}

export function DashboardLogoutErrorToast() {
  return (
    <Suspense fallback={null}>
      <DashboardLogoutErrorToastContent />
    </Suspense>
  )
}
