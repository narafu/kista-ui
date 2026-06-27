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
    eventSource.onerror = () => eventSource.close()

    return () => {
      eventSource.removeEventListener('status', handleStatus)
      eventSource.close()
    }
  }, [router])

  return null
}
