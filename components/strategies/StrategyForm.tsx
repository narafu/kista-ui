'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMeta } from '@/components/providers/MetaProvider'
import { createStrategy, updateStrategy } from '@/lib/api/strategies'
import { ApiError } from '@/lib/api/client'
import type { Strategy, StrategyRequest } from '@/types/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { meta, findStrategyType } = useMeta()
  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [multiple, setMultiple] = useState<string>(initial?.multiple ?? '')
  const [loading, setLoading] = useState(false)

  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []

  // type 변경 시 ticker / multiple 기본값 자동 설정
  useEffect(() => {
    if (!typeMeta) return
    // 새 등록 시 또는 type 변경 후 ticker가 availableTickers에 없으면 default 적용
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(typeMeta.defaultTicker)
    }
    if (!multiple) {
      setMultiple(typeMeta.defaultMultiple)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('전략 타입을 선택하세요'); return }
    if (!ticker) { toast.error('종목을 선택하세요'); return }

    setLoading(true)
    try {
      const payload: StrategyRequest = { type, ticker, multiple: multiple || undefined }
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

      {/* multiple */}
      <div className="space-y-2">
        <Label htmlFor="multiple">매수 배수</Label>
        <Input
          id="multiple"
          inputMode="decimal"
          value={multiple}
          onChange={(e) => setMultiple(e.target.value)}
          disabled={loading}
          placeholder={typeMeta?.defaultMultiple ?? '1.0'}
        />
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
