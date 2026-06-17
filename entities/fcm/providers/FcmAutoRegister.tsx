'use client'

import { useEffect } from 'react'
import { requestFcmToken, registerTokenToServer } from '@entities/fcm'
import type { NotificationChannel } from '@entities/user'

interface Props {
  notificationChannel: NotificationChannel
}

// 푸시 알림 채널 사용자: 로그인 시 FCM 토큰을 자동 등록한다.
// - 이미 허용된 기기: 즉시 토큰 등록
// - 미결정(새 기기/브라우저): requestPermission 팝업 후 허용 시 등록
// - 거부된 기기: 아무것도 하지 않음
export function FcmAutoRegister({ notificationChannel }: Props) {
  useEffect(() => {
    if (notificationChannel !== 'FCM' && notificationChannel !== 'ALL') return
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'denied') return

    requestFcmToken()
      .then((token) => { if (token) return registerTokenToServer(token) })
      .catch(() => {})
  }, [notificationChannel])

  return null
}
