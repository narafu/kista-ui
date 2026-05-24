'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useMeta } from '@/components/providers/MetaProvider'
import { createStrategy, updateStrategy } from '@/lib/api/strategies'
import { getMargin, getPrices, type PriceMap } from '@/lib/api/accounts'
import { getPrivacyCurrentBase } from '@/lib/api/privacy'
import { ApiError } from '@/lib/api/client'
import { MultipleInput } from './MultipleInput'
import type { Strategy, StrategyRequest } from '@/types/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

const INFINITE_TICKERS = ['TQQQ', 'SOXL', 'USD']

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { meta, findStrategyType } = useMeta()
  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [multiple, setMultiple] = useState<string>(initial?.multiple ?? '')
  const [loading, setLoading] = useState(false)

  // 기준가/예수금 state
  const [usdDeposit, setUsdDeposit] = useState<number | null>(null)
  const [prices, setPrices] = useState<PriceMap | null>(null)
  const [privacyBase, setPrivacyBase] = useState<number | null>(null)
  const [loadingBase, setLoadingBase] = useState(!initial) // 수정 모드는 스킵

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []

  // 다이얼로그 열릴 때 예수금 + 종목가격 + PRIVACY 기준가 한 번에 조회
  useEffect(() => {
    if (initial) return // 수정 모드 스킵
    setLoadingBase(true)
    // per-promise .catch: 하나 실패해도 나머지 결과는 살림 (Promise.all fail-fast 방지)
    Promise.all([
      getMargin(accountId).catch(() => null),
      getPrices(accountId, INFINITE_TICKERS).catch(() => null),
      getPrivacyCurrentBase().catch(() => null),
    ]).then(([margin, priceMap, privacy]) => {
      const usd = margin?.find((m) => m.currency === 'USD')?.integratedOrderableAmount ?? null
      setUsdDeposit(usd)
      setPrices(priceMap)
      setPrivacyBase(privacy?.currentCycleStart ?? null)
      if (!margin && !priceMap && !privacy) {
        toast.error('예수금 / 기준가 조회에 실패했습니다')
      }
    }).finally(() => {
      setLoadingBase(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  // type 변경 시 ticker / multiple 기본값 자동 설정
  useEffect(() => {
    if (!typeMeta) return
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(typeMeta.defaultTicker)
    }
    if (!multiple) {
      setMultiple(typeMeta.defaultMultiple)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // 현재 선택된 type + ticker 에 대한 기준가
  const basePrice = useMemo(() => {
    if (!type || !ticker) return null
    // 메타 코드 기반으로 INFINITE/PRIVACY 판별 (리터럴 하드코딩 피함)
    const isInfinite = typeMeta?.availableTickers?.length === 3
    if (isInfinite) return prices?.[ticker] ?? null
    // PRIVACY (single ticker)
    return privacyBase
  }, [type, ticker, typeMeta, prices, privacyBase])

  // MAX 배수 = floor(예수금 / 기준가 / 0.5) * 0.5
  const maxMultiple = useMemo(() => {
    if (basePrice == null || usdDeposit == null || basePrice <= 0 || usdDeposit <= 0) return null
    return Math.floor(usdDeposit / basePrice / 0.5) * 0.5
  }, [basePrice, usdDeposit])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('전략 타입을 선택하세요'); return }
    if (!ticker) { toast.error('종목을 선택하세요'); return }

    // PRIVACY 기준 매매표 없으면 등록 차단
    const isSingleTicker = availableTickers.length === 1
    if (isSingleTicker && privacyBase === null && !initial) {
      alert('오늘 이후 날짜의 기준 매매표가 없어 등록할 수 없습니다')
      return
    }

    // 매수 배수 검증
    if (multiple) {
      const multipleNum = parseFloat(multiple)
      if (isNaN(multipleNum)) { toast.error('매수 배수가 올바르지 않습니다'); return }
      if (Math.abs(Math.round(multipleNum / 0.5) * 0.5 - multipleNum) > 1e-9) {
        alert('매수 배수는 0.5 단위로 입력해야 합니다')
        return
      }
      if (maxMultiple !== null && multipleNum > maxMultiple) {
        alert(`최대 ${maxMultiple}배까지 입력 가능합니다 (예수금 기준)`)
        return
      }
    }

    setLoading(true)
    try {
      const payload: StrategyRequest = {
        type,
        ticker,
        multiple: multiple || undefined,
        initialUsdDeposit: !initial && usdDeposit !== null ? usdDeposit : undefined,
      }
      if (initial) {
        await updateStrategy(initial.id, payload)
        toast.success('전략이 수정되었습니다')
      } else {
        await createStrategy(accountId, payload)
        toast.success('전략이 등록되었습니다')
      }
      onSuccess?.()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof ApiError ? '저장에 실패했습니다' : '오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* 전략 타입 카드 */}
      <div className="space-y-2">
        <Label>매매 전략</Label>
        <div className="grid grid-cols-2 gap-3">
          {meta.strategyTypes.map((t) => {
            const selected = type === t.code
            return (
              <button
                key={t.code}
                type="button"
                onClick={() => setType(t.code)}
                disabled={loading}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  border: selected ? '2px solid var(--rose-500)' : '1px solid var(--border)',
                  background: selected ? 'var(--rose-50)' : 'var(--card)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <p style={{ fontSize: 14, fontWeight: 700, color: selected ? 'var(--rose-600)' : 'var(--foreground)' }}>
                  {t.label}
                </p>
                {t.description && (
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{t.description}</p>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 종목 */}
      <div className="space-y-2">
        <Label>종목</Label>
        {availableTickers.length > 1 ? (
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${availableTickers.length}, 1fr)` }}>
            {availableTickers.map((code) => {
              const tickerMeta = meta.tickers.find((tk) => tk.code === code)
              const sel = ticker === code
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTicker(code)}
                  disabled={loading}
                  style={{
                    padding: '12px 4px',
                    borderRadius: 10,
                    textAlign: 'center',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    border: sel ? '2px solid var(--rose-500)' : '1px solid var(--border)',
                    background: sel ? 'var(--rose-50)' : 'var(--card)',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 700, color: sel ? 'var(--rose-600)' : 'var(--foreground)' }}>
                    {code}
                  </div>
                  {tickerMeta?.label && tickerMeta.label !== code && (
                    <div style={{ fontSize: 11, color: sel ? 'var(--rose-500)' : 'var(--muted-foreground)', marginTop: 2 }}>
                      {tickerMeta.label}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ) : availableTickers.length === 1 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '12px 14px',
              borderRadius: 10,
              border: '1px solid var(--border)',
              background: 'var(--muted)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>{availableTickers[0]}</span>
            <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>(고정)</span>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">선택 가능한 종목이 없습니다.</p>
        )}
      </div>

      {/* 예수금 표시 (등록 모드 전용) */}
      {!initial && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--muted)',
            padding: '10px 14px',
            fontSize: 13,
          }}
        >
          <span style={{ color: 'var(--muted-foreground)' }}>USD 예수금</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
            {loadingBase ? '조회 중...' : usdDeposit !== null ? `$${usdDeposit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '--'}
          </span>
        </div>
      )}

      {/* 매수 배수 */}
      <div className="space-y-2">
        <Label htmlFor="multiple">매수 배수</Label>
        <MultipleInput
          value={multiple}
          onChange={setMultiple}
          max={maxMultiple}
          disabled={loading}
          loading={loadingBase}
        />
        {/* 기준가 / MAX 보조 텍스트 */}
        {!initial && (
          <p className="text-[11px] text-muted-foreground">
            {loadingBase
              ? '기준가 조회 중...'
              : basePrice !== null && maxMultiple !== null
                ? `기준가: $${basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} · MAX: ${maxMultiple}배`
                : basePrice !== null
                  ? `기준가: $${basePrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`
                  : ticker
                    ? '기준가를 가져오지 못했습니다'
                    : '종목을 선택하면 MAX가 계산됩니다'}
          </p>
        )}
        {typeMeta?.defaultMultiple && (
          <p className="text-[11px] text-muted-foreground">기본값: {typeMeta.defaultMultiple}</p>
        )}
      </div>

      <div className="flex gap-2 pt-2">
        {onCancel && (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
            취소
          </Button>
        )}
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? '저장 중...' : initial ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  )
}
