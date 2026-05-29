'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PendingStatusWatcher() {
  const router = useRouter()

  useEffect(() => {
    const eventSource = new EventSource('/api/auth/status-stream')

    const handleStatus = (e: MessageEvent) => {
      if (e.data === 'ACTIVE') router.push('/dashboard')
      if (e.data === 'REJECTED') router.push('/rejected')
    }

    eventSource.addEventListener('status', handleStatus)
    eventSource.onerror = () => eventSource.close()

    return () => {
      eventSource.removeEventListener('status', handleStatus)
      eventSource.close()
    }
  }, [router])

  return null
}
