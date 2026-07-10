'use client'

import { useState, useCallback, useRef } from 'react'
import { requestFcmToken, registerTokenToServer } from '../api'

type Status = 'idle' | 'requesting' | 'ready' | 'registered' | 'denied' | 'error'

export function useFcmToken() {
  const [status, setStatus] = useState<Status>('idle')
  const tokenRef = useRef<string | null>(null)

  // permission 이미 granted 시 마운트 시점에 토큰 사전 취득
  const prewarm = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (tokenRef.current) return
    try {
      const token = await requestFcmToken()
      if (token) {
        tokenRef.current = token
        setStatus('ready')
      }
    } catch {}
  }, [])

  // 캐시된 토큰 있으면 즉시 반환, 없으면 permission 요청 후 취득
  const acquireToken = useCallback(async (): Promise<string | null> => {
    if (tokenRef.current) return tokenRef.current
    setStatus('requesting')
    const token = await requestFcmToken()
    if (!token) {
      // permission 거부 vs FCM 토큰 발급 자체 실패(브라우저 미지원 등) 구분
      const isDenied = typeof Notification !== 'undefined' && Notification.permission === 'denied'
      setStatus(isDenied ? 'denied' : 'error')
      return null
    }
    tokenRef.current = token
    setStatus('ready')
    return token
  }, [])

  const requestAndRegister = useCallback(async (): Promise<boolean> => {
    const token = await acquireToken()
    if (!token) return false
    try {
      await registerTokenToServer(token)
      setStatus('registered')
      return true
    } catch {
      setStatus('error')
      return false
    }
  }, [acquireToken])

  // 이미 취득된 토큰만 반환 — 권한 요청/새 토큰 발급 없음 (알림 끄기 등 부수효과 없는 조회용)
  const getCachedToken = useCallback((): string | null => tokenRef.current, [])

  return { status, prewarm, acquireToken, requestAndRegister, getCachedToken }
}
