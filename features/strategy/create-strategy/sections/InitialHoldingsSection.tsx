'use client'

import { useId, type ReactNode } from 'react'
import { UnitInput } from '@shared/ui/UnitInput'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  avgPrice: number | null
  quantity: number | null
  setField: (field: 'avgPrice' | 'quantity', value: number | null) => void
  loading: boolean
  priceUnit?: string
  priceMaxDecimals?: number
  quantityUnit?: string
  quantityMaxDecimals?: number
  caption?: ReactNode
  error?: string
}

// 중간부터 시작 — 이미 종목을 보유 중인 사용자가 기존 평단가·수량을 입력해 그 지점부터 전략을 시작하는 공통 입력(등록 전용)
export function InitialHoldingsSection({
  avgPrice, quantity, setField, loading,
  priceUnit = 'USD', priceMaxDecimals = 2, quantityUnit = '주', quantityMaxDecimals, caption, error,
}: Props) {
  const id = useId()
  return (
    <div className="py-[18px] border-b border-border">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <StrategyFieldLabel htmlFor={`${id}-avgPrice`}>평단가</StrategyFieldLabel>
          <UnitInput
            id={`${id}-avgPrice`}
            value={avgPrice}
            onChange={(value) => setField('avgPrice', value)}
            unit={priceUnit}
            disabled={loading}
            unitClassName="ml-1.5"
            maxDecimals={priceMaxDecimals}
          />
        </div>
        <div>
          <StrategyFieldLabel htmlFor={`${id}-quantity`}>수량</StrategyFieldLabel>
          <UnitInput
            id={`${id}-quantity`}
            value={quantity}
            onChange={(value) => setField('quantity', value)}
            unit={quantityUnit}
            disabled={loading}
            unitClassName="ml-1.5"
            maxDecimals={quantityMaxDecimals}
          />
        </div>
      </div>
      {caption && <p className="mt-2 text-sm text-muted-foreground">{caption}</p>}
      {error && <p role="alert" className="mt-1 text-sm text-[var(--status-error)]">{error}</p>}
    </div>
  )
}
