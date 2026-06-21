'use client'

import { cn } from '@shared/lib/utils'
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
}

export function StrategyTickerSection({
  initial, ticker, availableTickers, prices, basePrice, loading, onTickerChange,
}: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>종목</StrategyFieldLabel>
      {initial ? (
        <div className="flex items-center justify-between px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-[800]">{initial.ticker}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
              고정
            </span>
          </div>
          {basePrice !== null && (
            <span className="text-xs text-muted-foreground tabular-nums">
              ${fmtUsd(basePrice)}
            </span>
          )}
        </div>
      ) : availableTickers.length > 1 ? (
        <div className="overflow-x-auto px-1 py-0.5 [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/60">
          <div className="flex gap-2 w-max">
          {availableTickers.map((code) => {
            const sel = ticker === code
            const price = prices?.[code]
            return (
              <button
                key={code}
                type="button"
                onClick={() => onTickerChange(code)}
                disabled={loading}
                className={cn(
                  'shrink-0 min-w-[78px] px-3 py-2 rounded-[var(--r-sm)] text-center transition-[border-color,background] duration-150',
                  loading ? 'cursor-not-allowed' : 'cursor-pointer',
                )}
                style={{
                  border: sel ? '1.5px solid var(--rose-500)' : '1px solid var(--border)',
                  background: sel ? 'var(--rose-50)' : 'var(--card)',
                }}
              >
                <div
                  className="text-[13px] font-[800]"
                  style={{ color: sel ? 'var(--rose-600)' : 'var(--foreground)' }}
                >
                  {code}
                </div>
                {price !== undefined && (
                  <div className="text-[10.5px] text-muted-foreground mt-0.5 tabular-nums">
                    ${fmtUsd(price)}
                  </div>
                )}
              </button>
            )
          })}
          </div>
        </div>
      ) : availableTickers.length === 1 ? (
        <div className="flex items-center justify-between px-[14px] py-3 rounded-[var(--r-sm)] border border-border bg-muted">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-[800]">{availableTickers[0]}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-muted-foreground text-card tracking-[0.06em]">
              고정
            </span>
          </div>
          {prices?.[availableTickers[0]] !== undefined && (
            <span className="text-xs text-muted-foreground tabular-nums">
              ${fmtUsd(prices![availableTickers[0]])}
            </span>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          선택 가능한 종목이 없습니다.
        </p>
      )}
    </div>
  )
}
