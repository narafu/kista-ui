'use client'

import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { Strategy } from '@/types/strategy'
import type { PriceMap } from '@/lib/api/accounts'

function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

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
    <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
      <StrategyFieldLabel>종목</StrategyFieldLabel>
      {initial ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{initial.ticker}</span>
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
              }}
            >
              고정
            </span>
          </div>
          {basePrice !== null && (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
              ${fmtUsd(basePrice)}
            </span>
          )}
        </div>
      ) : availableTickers.length > 1 ? (
        <div
          style={{
            display: 'flex', gap: 8, overflowX: 'auto', minWidth: 0,
            padding: '2px 4px',
          }}
        >
          {availableTickers.map((code) => {
            const sel = ticker === code
            const price = prices?.[code]
            return (
              <button
                key={code}
                type="button"
                onClick={() => onTickerChange(code)}
                disabled={loading}
                style={{
                  flexShrink: 0, minWidth: 78, padding: '8px 12px',
                  borderRadius: 'var(--r-sm)', textAlign: 'center',
                  border: sel ? '1.5px solid var(--rose-500)' : '1px solid var(--border)',
                  background: sel ? 'var(--rose-50)' : 'var(--card)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div
                  style={{
                    fontSize: 13, fontWeight: 800,
                    color: sel ? 'var(--rose-600)' : 'var(--foreground)',
                  }}
                >
                  {code}
                </div>
                {price !== undefined && (
                  <div
                    style={{
                      fontSize: 10.5, color: 'var(--muted-foreground)',
                      marginTop: 2, fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    ${fmtUsd(price)}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      ) : availableTickers.length === 1 ? (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{availableTickers[0]}</span>
            <span
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
              }}
            >
              고정
            </span>
          </div>
          {prices?.[availableTickers[0]] !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
              ${fmtUsd(prices![availableTickers[0]])}
            </span>
          )}
        </div>
      ) : (
        <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          선택 가능한 종목이 없습니다.
        </p>
      )}
    </div>
  )
}
