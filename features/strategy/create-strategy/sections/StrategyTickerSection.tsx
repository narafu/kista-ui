'use client'

import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import { fmtUsd } from '@shared/lib/format'
import { cn } from '@shared/lib/utils'
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
  // 고를 수 없는 경우(수정·허용 종목 1개·관리자 고정)는 읽기전용 카드 — 고정이면 선택값(설정 기본값)
  const fixedCode = initial?.ticker
    ?? (availableTickers.length === 1 ? availableTickers[0] : !customizable && availableTickers.length > 1 ? ticker : null)
  const fixedPrice = initial ? basePrice : fixedCode ? prices?.[fixedCode] ?? null : null
  // 5개부터는 한 줄에 가격이 들어가지 않아 4열로 줄을 바꾼다
  const wraps = availableTickers.length > 4

  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>종목</StrategyFieldLabel>
      {!initial && customizable && availableTickers.length > 1 ? (
        <div className={cn('gap-2 py-0.5', wraps ? 'grid grid-cols-4' : 'flex')}>
          {availableTickers.map((code) => {
            const sel = ticker === code
            const price = prices?.[code]
            return (
              <SelectionCard
                key={code}
                selected={sel}
                onClick={() => onTickerChange(code)}
                disabled={loading}
                className={cn('min-w-0 flex-1 py-2 text-center', wraps ? 'px-1' : 'px-3')}
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
      ) : fixedCode ? (
        <div className="flex items-center justify-between px-[14px] py-3 rounded-sm border border-border bg-muted">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-[800]">{fixedCode}</span>
          </div>
          {fixedPrice !== null && (
            <span className="text-sm text-muted-foreground tabular-nums">
              ${fmtUsd(fixedPrice)}
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
