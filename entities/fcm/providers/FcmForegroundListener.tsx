'use client'

import { useEffect } from 'react'
import { onMessage } from 'firebase/messaging'
import { getFirebaseMessaging } from '@shared/lib/firebase'

interface Props {
  enabled: boolean
}

export function FcmForegroundListener({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return

    const messaging = getFirebaseMessaging()
    if (!messaging) return

    return onMessage(messaging, (payload) => {
      if (typeof Notification === 'undefined') return
      if (Notification.permission !== 'granted') return

      const title = payload.notification?.title
      if (!title) return

      const options: NotificationOptions & { image?: string } = {
        icon: '/icon-192.png',
      }
      if (payload.notification?.body) options.body = payload.notification.body
      if (payload.notification?.image) options.image = payload.notification.image

      if (!('serviceWorker' in navigator)) return
      void navigator.serviceWorker.ready
        .then((registration) => registration.showNotification(title, options))
        .catch(() => {})
    })
  }, [enabled])

  return null
}
