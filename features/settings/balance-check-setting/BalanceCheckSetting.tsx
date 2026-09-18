'use client'

import { useMeQuery, useUpdateBalanceCheckEnabledMutation } from '@entities/user'
import { Switch } from '@/components/ui/switch'

export function BalanceCheckSetting() {
  const { data: user } = useMeQuery()
  const enabled = user?.balanceCheckEnabled ?? true
  const mutation = useUpdateBalanceCheckEnabledMutation()

  function handleToggle(next: boolean) {
    mutation.mutate(next)
  }

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-bold">잔고 검증</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          끄면 예수금이 부족해도 전략을 생성·재등록합니다.
          미리보기로 주문금액을 확인 후 필요한 금액만 이체해 운용할 수 있습니다.
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={handleToggle}
        disabled={mutation.isPending}
        aria-label="잔고 검증"
      />
    </div>
  )
}
