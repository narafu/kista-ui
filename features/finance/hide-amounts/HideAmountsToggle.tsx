'use client'

import { Switch } from '@/components/ui/switch'
import { useAmountHiddenPreference } from '@shared/lib/hooks/use-amount-hidden'

export function HideAmountsToggle() {
  const { hidden, setAmountHidden } = useAmountHiddenPreference()

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1">
        <h2 className="text-sm font-bold">금액 감추기</h2>
        <div className="text-sm text-muted-foreground mt-0.5">
          켜면 자산·수입·소비·저축 탭의 모든 금액이 가려지고, 상단 보기 버튼으로 잠깐 확인할 수 있습니다.
        </div>
      </div>
      <Switch checked={hidden === true} onCheckedChange={setAmountHidden} aria-label="금액 감추기" />
    </div>
  )
}
