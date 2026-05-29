'use client'

import { useEffect } from 'react'
import { requestFcmToken, registerTokenToServer } from '@/lib/fcm'
import type { NotificationChannel } from '@/types/user'

interface Props {
  notificationChannel: NotificationChannel
}

// 이미 알림 권한이 허용된 기기에서 자동으로 FCM 토큰을 등록한다.
// 새 브라우저/기기로 접속 시 설정 페이지를 거치지 않아도 알림을 수신할 수 있다.
export function FcmAutoRegister({ notificationChannel }: Props) {
  useEffect(() => {
    if (notificationChannel !== 'FCM' && notificationChannel !== 'ALL') return
    if (typeof Notification === 'undefined') return
    if (Notification.permission !== 'granted') return

    requestFcmToken()
      .then((token) => { if (token) return registerTokenToServer(token) })
      .catch(() => {})
  }, [notificationChannel])

  return null
}
