'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { clientFetch } from '@/lib/api/client'
import { useFcmToken } from '@/hooks/useFcmToken'

type Channel = 'TELEGRAM' | 'FCM' | 'ALL'

interface NotificationSettingsProps {
  currentChannel: Channel
}

export function NotificationSettings({ currentChannel }: NotificationSettingsProps) {
  const router = useRouter()
  const [channel, setChannel] = useState<Channel>(currentChannel)
  const [loading, setLoading] = useState(false)
  const { status: fcmStatus, requestAndRegister } = useFcmToken()

  async function handleChannelSelect(next: Channel) {
    if (next === channel) return
    setLoading(true)
    try {
      // FCM 선택 시 먼저 토큰 등록 — 실패 시 채널 변경 중단
      if ((next === 'FCM' || next === 'ALL') && fcmStatus !== 'registered') {
        const ok = await requestAndRegister()
        if (!ok) return
      }

      await clientFetch<void>('/api/settings/notification-channel', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: next }),
      })

      setChannel(next)
      router.refresh()
    } catch (err) {
      console.error('알림 채널 변경 실패:', err)
    } finally {
      setLoading(false)
    }
  }

  const channels: { value: Channel; label: string; desc: string }[] = [
    { value: 'TELEGRAM', label: '텔레그램', desc: '텔레그램 봇 알림' },
    { value: 'FCM', label: '푸시 알림', desc: '브라우저 / 모바일 푸시' },
    { value: 'ALL', label: '모두', desc: '텔레그램 + 푸시 동시 수신' },
  ]

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
      {fcmStatus === 'denied' && (
        <p className="text-[11.5px] mt-2" style={{ color: 'var(--neg)' }}>
          브라우저 알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.
        </p>
      )}
      {fcmStatus === 'registered' && (
        <p className="text-[11.5px] mt-2" style={{ color: 'var(--pos)' }}>
          푸시 알림이 등록되었습니다.
        </p>
      )}
    </div>
  )
}
