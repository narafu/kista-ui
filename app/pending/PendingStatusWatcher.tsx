'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PendingStatusWatcher() {
  const router = useRouter()

  useEffect(() => {
    const eventSource = new EventSource('/api/auth/status-stream')

    const handleStatus = (e: MessageEvent) => {
      // eslint-disable-next-line react-doctor/nextjs-no-client-side-redirect
      if (e.data === 'ACTIVE') router.push('/dashboard')
      // eslint-disable-next-line react-doctor/nextjs-no-client-side-redirect
      if (e.data === 'REJECTED') router.push('/rejected')
    }

    eventSource.addEventListener('status', handleStatus)
    // onerror에서 close하지 않는다 — 네트워크 끊김(kista-api 교체 등)은 브라우저가 자동 재연결하고, 비-200 응답은 브라우저가 스스로 닫는다

    return () => {
      eventSource.removeEventListener('status', handleStatus)
      eventSource.close()
    }
  }, [router])

  return null
}
