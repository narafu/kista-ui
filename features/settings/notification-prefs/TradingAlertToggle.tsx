'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useUpdateNotificationPrefMutation } from '@entities/user'
import type { NotificationChannel } from '@entities/user'

interface Props {
  initialEnabled: boolean
  channel: NotificationChannel
}

export function TradingAlertToggle({ initialEnabled, channel }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const mutation = useUpdateNotificationPrefMutation()
  const isChannelOff = channel === 'NONE'

  function handleToggle() {
    if (isChannelOff) {
      toast.info('알림 수단을 먼저 선택해주세요')
      return
    }
    const next = !enabled
    setEnabled(next)
    mutation.mutate({ type: 'TRADING_ALERT', enabled: next })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={mutation.isPending}
        onClick={handleToggle}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isChannelOff ? 'opacity-50 cursor-not-allowed' : '',
          enabled && !isChannelOff ? 'bg-[var(--rose-600,theme(colors.rose.600))]' : 'bg-input',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
            enabled && !isChannelOff ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {isChannelOff && (
        <span className="text-[10.5px] text-muted-foreground">알림 수단을 먼저 선택하세요</span>
      )}
    </div>
  )
}
