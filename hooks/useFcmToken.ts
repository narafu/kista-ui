'use client'

import { useState, useCallback } from 'react'
import { requestFcmToken, registerTokenToServer } from '@/lib/fcm'

type Status = 'idle' | 'requesting' | 'registered' | 'denied' | 'error'

export function useFcmToken() {
  const [status, setStatus] = useState<Status>('idle')

  const requestAndRegister = useCallback(async () => {
    setStatus('requesting')
    try {
      const token = await requestFcmToken()
      if (!token) {
        setStatus('denied')
        return
      }
      await registerTokenToServer(token)
      setStatus('registered')
    } catch {
      setStatus('error')
    }
  }, [])

  return { status, requestAndRegister }
}
