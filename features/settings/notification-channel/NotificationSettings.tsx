'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUpdateNotificationChannelMutation } from '@entities/user'
import { useFcmToken, registerTokenToServer, unregisterTokenFromServer } from '@entities/fcm'
import type { NotificationChannel } from '@entities/user'
import { Spinner } from '@shared/ui/Spinner'
import { SelectionCard } from '@shared/ui/selection-card'

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
  const { status: fcmStatus, prewarm, acquireToken, getCachedToken } = useFcmToken()
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
      const wasFcm = currentChannel === 'FCM' || currentChannel === 'ALL'
      const willBeFcm = next === 'FCM' || next === 'ALL'

      if (wasFcm && !willBeFcm) {
        // 알림 끄는 상황에서 새 권한 요청을 하면 안 되므로 캐시된 토큰만 사용 (best-effort)
        const cachedToken = getCachedToken()
        await mutation.mutateAsync(next)
        if (cachedToken) unregisterTokenFromServer(cachedToken).catch(() => {})
        return
      }

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
        return
      }

      await mutation.mutateAsync(next)
      if (next === 'FCM' || next === 'ALL') {
        toast.success('푸시 알림이 등록되었습니다')
      }
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
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {NOTIFICATION_CHANNELS.map((c) => (
          <SelectionCard
            key={c.value}
            selected={currentChannel === c.value}
            onClick={() => handleChannelSelect(c.value)}
            disabled={pendingChannel !== null}
            className="min-w-0 px-3 py-3 text-sm"
          >
            {pendingChannel === c.value ? (
              <div className="flex items-center gap-1.5">
                <Spinner size={12} className="shrink-0" />
                <div className="font-medium text-sm">적용 중...</div>
              </div>
            ) : (
              <>
                <div className="font-medium text-sm break-keep">{c.label}</div>
                <div className="text-sm text-muted-foreground break-keep">{c.desc}</div>
              </>
            )}
          </SelectionCard>
        ))}
      </div>

      {needsTelegram && (
        <p className="text-sm mt-2" style={{ color: 'var(--warn)' }}>
          텔레그램 알림을 받으려면 위에서 텔레그램 봇을 먼저 연결해주세요.
        </p>
      )}
      {fcmStatus === 'denied' && (
        <p className="text-sm mt-2 text-destructive">
          알림이 차단되어 있습니다. 브라우저 설정 &gt; 알림에서 이 사이트를 허용해주세요.
        </p>
      )}
      {fcmStatus === 'error' && (
        <p className="text-sm mt-2" style={{ color: 'var(--warn)' }}>
          {'Notification' in window && 'PushManager' in window
            ? '푸시 알림 설정에 실패했습니다. 새로고침 후 다시 시도해주세요.'
            : '이 브라우저에서는 푸시 알림이 지원되지 않습니다. Chrome 또는 Edge를 이용해주세요.'}
        </p>
      )}
    </div>
  )
}
