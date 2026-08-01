'use client'

import { useEffect } from 'react'
import { requestFcmToken, registerTokenToServer } from '@entities/fcm'
import type { NotificationChannel } from '@entities/user'

interface Props {
  notificationChannel: NotificationChannel
}

// 푸시 알림 채널 사용자: 이미 허용된 기기에서만 FCM 토큰을 자동 등록한다.
// 미결정(default) 기기는 설정 화면의 채널 변경(사용자 제스처)에서 권한을 요청한다 — 진입 즉시 권한 팝업 금지.
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
