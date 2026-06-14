'use client'

import { useState } from 'react'
import { useUpdateBalanceCheckEnabledMutation } from '@entities/user'

interface Props {
  initialEnabled: boolean
}

export function BalanceCheckSetting({ initialEnabled }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const mutation = useUpdateBalanceCheckEnabledMutation()

  function toggle() {
    const next = !enabled
    setEnabled(next)
    mutation.mutate(next)
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-[13px] font-bold">잔고 검증</div>
        <div className="text-[11.5px] text-muted-foreground mt-0.5">
          끄면 예수금이 부족해도 전략을 생성·재등록합니다.
          미리보기로 주문금액을 확인 후 필요한 금액만 이체해 운용할 수 있습니다.
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={mutation.isPending}
        onClick={toggle}
        className={[
          'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          enabled ? 'bg-[var(--rose-600,theme(colors.rose.600))]' : 'bg-input',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block size-5 rounded-full bg-background shadow-lg ring-0 transition-transform',
            enabled ? 'translate-x-5' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  )
}
