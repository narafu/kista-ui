'use client'

import { toast } from 'sonner'
import { useMeQuery, useUpdateNotificationPrefMutation } from '@entities/user'
import type { NotificationChannel } from '@entities/user'
import { Switch } from '@/components/ui/switch'

interface Props {
  type: string
  channel: NotificationChannel
}

export function TradingAlertToggle({ type, channel }: Props) {
  const { data: user } = useMeQuery()
  const enabled = user?.notificationPrefs?.[type] ?? true
  const mutation = useUpdateNotificationPrefMutation()
  const isChannelOff = channel === 'NONE'

  function handleToggle(next: boolean) {
    if (isChannelOff) {
      toast.info('알림 수단을 먼저 선택해주세요')
      return
    }
    mutation.mutate({ type, enabled: next })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Switch
        checked={enabled && !isChannelOff}
        onCheckedChange={handleToggle}
        disabled={mutation.isPending}
        aria-label="매매 알림"
        className={isChannelOff ? 'opacity-50' : ''}
      />
      {isChannelOff && (
        <span className="text-sm text-muted-foreground">알림 수단을 먼저 선택하세요</span>
      )}
    </div>
  )
}
