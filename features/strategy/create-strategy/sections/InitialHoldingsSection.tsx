'use client'

import { UnitInput } from '@shared/ui/UnitInput'

interface Props {
  avgPrice: number | null
  quantity: number | null
  setField: (field: 'avgPrice' | 'quantity', value: number | null) => void
  loading: boolean
}

// 중간부터 시작 — 이미 종목을 보유 중인 사용자가 기존 평단가·수량을 입력해 그 지점부터 전략을 시작하는 공통 입력(등록 전용)
export function InitialHoldingsSection({ avgPrice, quantity, setField, loading }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className="block mb-1 text-xs font-semibold text-muted-foreground">평단가</span>
          <UnitInput
            value={avgPrice}
            onChange={(value) => setField('avgPrice', value)}
            unit="USD"
            disabled={loading}
            unitClassName="ml-1.5"
            maxDecimals={2}
          />
        </label>
        <label>
          <span className="block mb-1 text-xs font-semibold text-muted-foreground">수량</span>
          <UnitInput
            value={quantity}
            onChange={(value) => setField('quantity', value)}
            unit="주"
            disabled={loading}
            unitClassName="ml-1.5"
          />
        </label>
      </div>
    </div>
  )
}
