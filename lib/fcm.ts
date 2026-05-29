import { getToken } from 'firebase/messaging'
import { getFirebaseMessaging } from './firebase'
import { clientFetch } from './api/client'

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ?? ''

export async function requestFcmToken(): Promise<string | null> {
  const messaging = getFirebaseMessaging()
  if (!messaging) return null

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return null

  try {
    return await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js'),
    })
  } catch (error) {
    console.error('FCM 토큰 발급 실패:', error)
    return null
  }
}

export async function registerTokenToServer(token: string): Promise<void> {
  await clientFetch<void>('/api/fcm/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: 'WEB' }),
  })
}
