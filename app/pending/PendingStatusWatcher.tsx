'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function PendingStatusWatcher() {
  const router = useRouter()

  useEffect(() => {
    const eventSource = new EventSource('/api/auth/status-stream')

    eventSource.addEventListener('status', (e) => {
      if (e.data === 'ACTIVE') router.push('/dashboard')
      if (e.data === 'REJECTED') router.push('/rejected')
    })

    eventSource.onerror = () => eventSource.close()

    return () => eventSource.close()
  }, [router])

  return null
}
