'use client'

import { useState } from 'react'
import { useUpdateNotificationPrefMutation } from '@entities/user'

interface Props {
  initialEnabled: boolean
}

export function TradingAlertToggle({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const mutation = useUpdateNotificationPrefMutation()

  function handleToggle() {
    const next = !enabled
    setEnabled(next)
    mutation.mutate({ type: 'TRADING_ALERT', enabled: next })
  }

  return (
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
        enabled ? 'bg-[var(--rose-600,theme(colors.rose.600))]' : 'bg-input',
      ].join(' ')}
    >
      <span
        className={[
          'pointer-events-none inline-block size-5 rounded-full bg-white shadow-lg ring-0 transition-transform',
          enabled ? 'translate-x-5' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
