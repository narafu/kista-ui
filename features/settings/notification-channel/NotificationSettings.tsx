'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUpdateNotificationChannelMutation } from '@entities/user'
import { useFcmToken, registerTokenToServer } from '@entities/fcm'
import type { NotificationChannel } from '@entities/user'

const NOTIFICATION_CHANNELS: { value: NotificationChannel; label: string; desc: string }[] = [
  { value: 'NONE', label: '끄기', desc: '알림을 받지 않습니다' },
  { value: 'FCM', label: '푸시 알림', desc: '브라우저 / 모바일 푸시' },
  { value: 'TELEGRAM', label: '텔레그램', desc: '텔레그램 봇 알림' },
  { value: 'ALL', label: '모두', desc: '텔레그램 + 푸시 동시 수신' },
]

interface Props {
  currentChannel: NotificationChannel
  hasTelegram: boolean
}

export function NotificationSettings({ currentChannel, hasTelegram }: Props) {
  const router = useRouter()
  const { status: fcmStatus, prewarm, acquireToken } = useFcmToken()
  const mutation = useUpdateNotificationChannelMutation()
  const [pendingChannel, setPendingChannel] = useState<NotificationChannel | null>(null)

  // permission 이미 granted인 경우 설정 페이지 진입 시 토큰 사전 취득
  useEffect(() => {
    prewarm()
  }, [prewarm])

  async function handleChannelSelect(next: NotificationChannel) {
    if (next === currentChannel || pendingChannel !== null) return
    if ((next === 'TELEGRAM' || next === 'ALL') && !hasTelegram) {
      toast.error('텔레그램 봇을 먼저 연결해주세요')
      return
    }

    setPendingChannel(next)

    try {
      if ((next === 'FCM' || next === 'ALL') && fcmStatus !== 'registered') {
        if (!('Notification' in window) || !('PushManager' in window)) {
          toast.error('이 기기/브라우저에서는 푸시 알림이 지원되지 않습니다. 데스크탑 브라우저를 이용해주세요')
          return
        }

        // 사전 취득된 토큰 있으면 즉시 사용, 없으면 permission 요청 후 취득
        const token = await acquireToken()
        if (!token) {
          if (Notification.permission === 'denied') {
            toast.error('알림이 차단되어 있습니다. 브라우저 설정 > 알림에서 허용 후 다시 시도해주세요')
          } else {
            toast.error('푸시 알림 토큰 발급에 실패했습니다. 잠시 후 다시 시도해주세요')
          }
          return
        }

        // 토큰 서버 등록 + 채널 변경 병렬 실행
        const [regResult, channelResult] = await Promise.allSettled([
          registerTokenToServer(token),
          mutation.mutateAsync(next),
        ])

        if (regResult.status === 'rejected') {
          toast.error('푸시 알림 등록에 실패했습니다')
          return
        }
        if (channelResult.status === 'rejected') {
          return
        }
        toast.success('푸시 알림이 등록되었습니다')
        router.refresh()
        return
      }

      await mutation.mutateAsync(next)
      if (next === 'FCM' || next === 'ALL') {
        toast.success('푸시 알림이 등록되었습니다')
      }
      router.refresh()
    } catch {
      // mutation 에러는 React Query가 처리
    } finally {
      setPendingChannel(null)
    }
  }

  const needsTelegram = !hasTelegram && (currentChannel === 'TELEGRAM' || currentChannel === 'ALL')

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="text-sm font-semibold text-muted-foreground mb-2">알림 수단</div>
      <div className="flex gap-2 flex-wrap">
        {NOTIFICATION_CHANNELS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handleChannelSelect(c.value)}
            disabled={pendingChannel !== null}
            className="rounded-lg border px-3 py-2 text-sm transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              currentChannel === c.value
                ? { borderColor: 'var(--rose-400)', background: 'var(--rose-50)', color: 'var(--rose-700)' }
                : { borderColor: 'var(--border)' }
            }
          >
            {pendingChannel === c.value ? (
              <div className="flex items-center gap-1.5">
                <svg className="animate-spin shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <div className="font-medium text-sm">적용 중...</div>
              </div>
            ) : (
              <>
                <div className="font-medium text-sm">{c.label}</div>
                <div className="text-xs text-muted-foreground">{c.desc}</div>
              </>
            )}
          </button>
        ))}
      </div>

      {needsTelegram && (
        <p className="text-xs mt-2" style={{ color: 'var(--warn)' }}>
          텔레그램 알림을 받으려면 위에서 텔레그램 봇을 먼저 연결해주세요.
        </p>
      )}
      {fcmStatus === 'denied' && (
        <p className="text-xs mt-2" style={{ color: 'var(--neg)' }}>
          알림이 차단되어 있습니다. 브라우저 설정 &gt; 알림에서 이 사이트를 허용해주세요.
        </p>
      )}
      {fcmStatus === 'error' && (
        <p className="text-xs mt-2" style={{ color: 'var(--warn)' }}>
          {'Notification' in window && 'PushManager' in window
            ? '푸시 알림 설정에 실패했습니다. 새로고침 후 다시 시도해주세요.'
            : '이 브라우저에서는 푸시 알림이 지원되지 않습니다. Chrome 또는 Edge를 이용해주세요.'}
        </p>
      )}
    </div>
  )
}
