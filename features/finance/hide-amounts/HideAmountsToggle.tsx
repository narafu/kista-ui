'use client'

import { Switch } from '@/components/ui/switch'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'

export function HideAmountsToggle() {
  const { hidden, setAmountHidden } = useAmountHiddenPreference()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm font-bold">금액 감추기</div>
        <div className="text-sm text-muted-foreground mt-0.5">
          켜면 자산·수입·소비·저축 탭 요약 금액이 계좌번호처럼 가려지고, 볼 수 있는 버튼으로 확인할 수 있습니다.
        </div>
      </div>
      <Switch checked={hidden} onCheckedChange={setAmountHidden} aria-label="금액 감추기" />
    </div>
  )
}
