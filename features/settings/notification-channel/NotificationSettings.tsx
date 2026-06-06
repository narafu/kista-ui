'use client'

import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { useUpdateNotificationChannelMutation } from '@entities/user'
import { useFcmToken } from '@entities/fcm'
import type { NotificationChannel } from '@entities/user'

interface Props {
  currentChannel: NotificationChannel
  hasTelegram: boolean
}

export function NotificationSettings({ currentChannel, hasTelegram }: Props) {
  const router = useRouter()
  const { status: fcmStatus, requestAndRegister } = useFcmToken()
  const mutation = useUpdateNotificationChannelMutation()

  async function handleChannelSelect(next: NotificationChannel) {
    if (next === currentChannel) return
    if ((next === 'TELEGRAM' || next === 'ALL') && !hasTelegram) {
      toast.error('텔레그램 봇을 먼저 연결해주세요')
      return
    }

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

    mutation.mutate(next, {
      onSuccess: () => {
        if (next === 'FCM' || next === 'ALL') {
          toast.success('푸시 알림이 등록되었습니다')
        }
        router.refresh()
      },
      onError: (err) => {
        console.error('알림 채널 변경 실패:', err)
      },
    })
  }

  const channels: { value: NotificationChannel; label: string; desc: string }[] = [
    { value: 'NONE', label: '끄기', desc: '알림을 받지 않습니다' },
    { value: 'FCM', label: '푸시 알림', desc: '브라우저 / 모바일 푸시' },
    { value: 'TELEGRAM', label: '텔레그램', desc: '텔레그램 봇 알림' },
    { value: 'ALL', label: '모두', desc: '텔레그램 + 푸시 동시 수신' },
  ]

  const needsTelegram = !hasTelegram && (currentChannel === 'TELEGRAM' || currentChannel === 'ALL')

  return (
    <div className="mt-4 pt-4 border-t border-border">
      <div className="text-[12.5px] font-semibold text-muted-foreground mb-2">알림 수단</div>
      <div className="flex gap-2 flex-wrap">
        {channels.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => handleChannelSelect(c.value)}
            disabled={mutation.isPending}
            className="rounded-lg border px-3 py-2 text-sm transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            style={
              currentChannel === c.value
                ? { borderColor: 'var(--rose-400)', background: 'var(--rose-50)', color: 'var(--rose-700)' }
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
