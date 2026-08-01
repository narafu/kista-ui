'use client'

import { useMeQuery } from '@entities/user'
import { FcmAutoRegister, FcmForegroundListener } from '@entities/fcm'

// notificationChannel을 레이아웃 SSR getMe 대신 canonical me query에서 소비한다.
export function FcmBridge() {
  const { data: me } = useMeQuery()
  const channel = me?.notificationChannel
  if (channel !== 'FCM' && channel !== 'ALL') return null
  return (
    <>
      <FcmAutoRegister notificationChannel={channel} />
      <FcmForegroundListener enabled />
    </>
  )
}
