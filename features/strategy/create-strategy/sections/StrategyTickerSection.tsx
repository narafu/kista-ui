'use client'

import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { fmtUsd } from '@shared/lib/format'
import type { Strategy } from '@entities/strategy'
import type { PriceMap } from '@entities/account'

interface Props {
  initial?: Strategy
  ticker: string
  availableTickers: string[]
  prices: PriceMap | null
  basePrice: number | null
  loading: boolean
  onTickerChange: (code: string) => void
  customizable: boolean
}

export function StrategyTickerSection({
  initial, ticker, availableTickers, prices, basePrice, loading, onTickerChange, customizable,
}: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>종목</StrategyFieldLabel>
      {initial ? (
        <div className="flex items-center justify-between px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-[800]">{initial.ticker}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
              고정
            </span>
          </div>
          {basePrice !== null && (
            <span className="text-sm text-muted-foreground tabular-nums">
              ${fmtUsd(basePrice)}
            </span>
          )}
        </div>
      ) : customizable && availableTickers.length > 1 ? (
        <div className="flex gap-2 py-0.5">
          {availableTickers.map((code) => {
            const sel = ticker === code
            const price = prices?.[code]
            return (
              <SelectionCard
                key={code}
                selected={sel}
                onClick={() => onTickerChange(code)}
                disabled={loading}
                className="min-w-0 flex-1 px-3 py-2 text-center"
              >
                <div className="text-sm font-[800]">
                  {code}
                </div>
                {price !== undefined && (
                  <div className="text-sm text-muted-foreground mt-0.5 tabular-nums">
                    ${fmtUsd(price)}
                  </div>
                )}
              </SelectionCard>
            )
          })}
        </div>
      ) : availableTickers.length === 1 ? (
        <div className="flex items-center justify-between px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-[800]">{availableTickers[0]}</span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
              고정
            </span>
          </div>
          {prices?.[availableTickers[0]] !== undefined && (
            <span className="text-sm text-muted-foreground tabular-nums">
              ${fmtUsd(prices![availableTickers[0]])}
            </span>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          선택 가능한 종목이 없습니다.
        </p>
      )}
    </div>
  )
}
