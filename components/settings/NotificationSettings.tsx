'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { clientFetch } from '@/lib/api/client'
import { useFcmToken } from '@/hooks/useFcmToken'
import type { NotificationChannel } from '@/types/user'

interface NotificationSettingsProps {
  currentChannel: NotificationChannel
  hasTelegram: boolean
}

export function NotificationSettings({ currentChannel, hasTelegram }: NotificationSettingsProps) {
  const router = useRouter()
  const [channel, setChannel] = useState<NotificationChannel>(currentChannel)
  const [loading, setLoading] = useState(false)

  // router.refresh() 후 서버에서 내려온 currentChannel을 state에 동기화
  useEffect(() => {
    setChannel(currentChannel)
  }, [currentChannel])
  const { status: fcmStatus, requestAndRegister } = useFcmToken()

  async function handleChannelSelect(next: NotificationChannel) {
    if (next === channel) return
    if ((next === 'TELEGRAM' || next === 'ALL') && !hasTelegram) {
      toast.error('텔레그램 봇을 먼저 연결해주세요')
      return
    }
    setLoading(true)
    try {
      if ((next === 'FCM' || next === 'ALL') && fcmStatus !== 'registered') {
        if (!('Notification' in window) || !('PushManager' in window)) {
          toast.error('이 기기/브라우저에서는 푸시 알림이 지원되지 않습니다. 데스크탑 브라우저를 이용해주세요')
          return
        }
        const ok = await requestAndRegister()
        if (!ok) {
          if (Notification.permission === 'denied') {
            toast.error('알림이 차단되어 있습니다. 브라우저 설정 > 알림에서 허용 후 다시 시도해주세요')
          } else {
            toast.error('브라우저 알림 권한을 허용해주세요')
          }
          return
        }
      }

      await clientFetch<void>('/api/settings/notification-channel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: next }),
      })

      setChannel(next)
      if (next === 'FCM' || next === 'ALL') {
        toast.success('푸시 알림이 등록되었습니다')
      }
      router.refresh()
    } catch (err) {
      console.error('알림 채널 변경 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const channels: { value: NotificationChannel; label: string; desc: string }[] = [
    { value: 'NONE', label: '끄기', desc: '알림을 받지 않습니다' },
    { value: 'FCM', label: '푸시 알림', desc: '브라우저 / 모바일 푸시' },
    { value: 'TELEGRAM', label: '텔레그램', desc: '텔레그램 봇 알림' },
    { value: 'ALL', label: '모두', desc: '텔레그램 + 푸시 동시 수신' },
  ]

  const needsTelegram =
    !hasTelegram && (channel === 'TELEGRAM' || channel === 'ALL')

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="text-[12.5px] font-semibold text-muted-foreground mb-2">알림 수단</div>
      <div className="flex gap-2 flex-wrap">
        {channels.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handleChannelSelect(c.value)}
            disabled={loading}
            className="rounded-lg border px-3 py-2 text-sm transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              channel === c.value
                ? {
                    borderColor: 'var(--rose-400)',
                    background: 'var(--rose-50)',
                    color: 'var(--rose-700)',
                  }
                : { borderColor: 'var(--border)' }
            }
          >
            <div className="font-medium text-[13px]">{c.label}</div>
            <div className="text-[11.5px] text-muted-foreground">{c.desc}</div>
          </button>
        ))}
      </div>

      {needsTelegram && (
        <p className="text-[11.5px] mt-2" style={{ color: 'var(--warn)' }}>
          텔레그램 알림을 받으려면 위에서 텔레그램 봇을 먼저 연결해주세요.
        </p>
      )}
      {fcmStatus === 'denied' && (
        <p className="text-[11.5px] mt-2" style={{ color: 'var(--neg)' }}>
          알림이 차단되어 있습니다. 브라우저 설정 &gt; 알림에서 이 사이트를 허용해주세요.
        </p>
      )}
    </div>
  )
}
