'use client'

import { useState, useCallback } from 'react'
import { requestFcmToken, registerTokenToServer } from '../api'

type Status = 'idle' | 'requesting' | 'registered' | 'denied' | 'error'

export function useFcmToken() {
  const [status, setStatus] = useState<Status>('idle')

  const requestAndRegister = useCallback(async (): Promise<boolean> => {
    setStatus('requesting')
    try {
      const token = await requestFcmToken()
      if (!token) {
        setStatus('denied')
        return false
      }
      await registerTokenToServer(token)
      setStatus('registered')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [])

  return { status, requestAndRegister }
}
