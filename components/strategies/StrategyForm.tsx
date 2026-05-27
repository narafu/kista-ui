'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { Zap, Activity, Check, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useMeta } from '@/components/providers/MetaProvider'
import { createStrategy, updateStrategy } from '@/lib/api/strategies'
import { getMargin, getPrices, type PriceMap } from '@/lib/api/accounts'
import { getPrivacyCurrentBase } from '@/lib/api/privacy'
import { ApiError } from '@/lib/api/client'
import { PercentGauge } from './PercentGauge'
import type { CycleSeedType, Strategy, StrategyRequest } from '@/types/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

function fmtUsd(n: number, digits = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{children}</span>
      {hint && <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>{hint}</span>}
    </div>
  )
}

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const router = useRouter()
  const { meta, findStrategyType } = useMeta()

  // ── 상태 ──────────────────────────────────────────────────────
  const [type, setType] = useState<string>(initial?.type ?? meta.strategyTypes[0]?.code ?? '')
  const [ticker, setTicker] = useState<string>(initial?.ticker ?? '')
  const [pct, setPct] = useState(100)
  const [autoStart, setAutoStart] = useState(initial ? initial.cycleSeedType !== 'NONE' : true)
  const [seedMode, setSeedMode] = useState<'KEEP' | 'MAX'>(
    initial?.cycleSeedType === 'MAINTAIN' ? 'KEEP' : 'MAX',
  )
  const [loading, setLoading] = useState(false)

  const [usdDeposit, setUsdDeposit] = useState<number | null>(null)
  const [prices, setPrices] = useState<PriceMap | null>(null)
  const [privacyBase, setPrivacyBase] = useState<number | null>(null)
  const [loadingBase, setLoadingBase] = useState(!initial)

  // ── 메타 파생 ─────────────────────────────────────────────────
  const typeMeta = useMemo(() => findStrategyType(type), [findStrategyType, type])
  const availableTickers = typeMeta?.availableTickers ?? []
  const isInfinite = (typeMeta?.availableTickers?.length ?? 0) > 1

  // ── 신규 등록 시 예수금 + 종목가격 + PRIVACY 기준가 병렬 조회 ──
  useEffect(() => {
    if (initial) return
    setLoadingBase(true)
    Promise.all([
      getMargin(accountId).catch(() => null),
      getPrices(accountId, meta.tickers.map((t) => t.code)).catch(() => null),
      getPrivacyCurrentBase().catch(() => null),
    ])
      .then(([margin, priceMap, privacy]) => {
        const usd = margin?.find((m) => m.currency === 'USD')?.integratedOrderableAmount ?? null
        setUsdDeposit(usd)
        setPrices(priceMap)
        setPrivacyBase(privacy?.currentCycleStart ?? null)
        if (!margin && !priceMap && !privacy) {
          toast.error('예수금 / 기준가 조회에 실패했습니다')
        }
      })
      .finally(() => setLoadingBase(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountId])

  // type 변경 시 ticker 기본값 설정
  useEffect(() => {
    if (!typeMeta) return
    if (!ticker || !availableTickers.includes(ticker)) {
      setTicker(typeMeta.availableTickers[0] ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type])

  // ── 계산 ──────────────────────────────────────────────────────
  const basePrice = useMemo(() => {
    if (!type || !ticker) return null
    if (isInfinite) return prices?.[ticker] ?? null
    return privacyBase
  }, [type, ticker, isInfinite, prices, privacyBase])

  // INFINITE: basePrice × 20 × 2 / PRIVACY: currentCycleStart / 2
  const minSeed = useMemo(() => {
    if (initial) return null
    if (isInfinite) return basePrice !== null ? basePrice * 20 * 2 : null
    return privacyBase !== null ? privacyBase / 2 : null
  }, [isInfinite, basePrice, privacyBase, initial])

  const seedUsd = usdDeposit !== null ? Math.round(usdDeposit * pct) / 100 : null
  const isBelowMinSeed = !initial && seedUsd !== null && minSeed !== null && seedUsd < minSeed
  const cannotSubmit = !initial && (isBelowMinSeed || basePrice === null)

  const cycleSeedType: CycleSeedType = !autoStart ? 'NONE' : seedMode === 'KEEP' ? 'MAINTAIN' : 'MAX'

  // ── 제출 ──────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!type) { toast.error('전략 타입을 선택하세요'); return }
    if (!ticker) { toast.error('종목을 선택하세요'); return }
    setLoading(true)
    try {
      const payload: StrategyRequest = initial
        ? { type: initial.type, ticker: initial.ticker, cycleSeedType }
        : { type, ticker, cycleSeedType, initialUsdDeposit: seedUsd ?? undefined }
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

  // ── 렌더 ──────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit}>

      {/* ─── 섹션 구분선 스타일 공통 ─────────────────────────────── */}
      {/* 섹션들은 border-bottom으로 구분, 마지막 섹션 제외 */}

      {/* ── A. 매매 전략 ── */}
      <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
        <FieldLabel hint="계좌당 1개">매매 전략</FieldLabel>
        {initial ? (
          /* 수정 모드: read-only */
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}>
            <span style={{
              fontSize: 13, fontWeight: 800,
              color: 'var(--rose-600)',
            }}>
              {initial.type}
            </span>
            <span style={{
              fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
              background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
            }}>고정</span>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {meta.strategyTypes.map((t) => {
              const selected = type === t.code
              const singleTicker = (t.availableTickers?.length ?? 0) <= 1
              return (
                <button
                  key={t.code}
                  type="button"
                  onClick={() => setType(t.code)}
                  disabled={loading}
                  style={{
                    padding: '16px 14px', borderRadius: 'var(--r-md)',
                    border: selected ? '1.5px solid var(--rose-500)' : '1px solid var(--border)',
                    background: selected ? 'var(--rose-50)' : 'var(--card)',
                    boxShadow: selected ? 'var(--sh-card)' : 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', gap: 8,
                    textAlign: 'left',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <span style={{ width: 16, height: 16, color: selected ? 'var(--rose-600)' : 'var(--muted-foreground)', flexShrink: 0 }}>
                    {singleTicker ? <Activity size={16} /> : <Zap size={16} />}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: selected ? 'var(--rose-600)' : 'var(--foreground)' }}>
                    {t.code}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── B. 종목 ── */}
      <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
        <FieldLabel hint={isInfinite ? '기준가 자동 조회' : 'SOXL 고정'}>종목</FieldLabel>
        {initial ? (
          /* 수정 모드: read-only */
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{initial.ticker}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
              }}>고정</span>
            </div>
            {basePrice !== null && (
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                ${fmtUsd(basePrice)}
              </span>
            )}
          </div>
        ) : availableTickers.length > 1 ? (
          /* INFINITE: 가로 스크롤 칩 */
          <div style={{ display: 'flex', gap: 6, overflowX: 'auto', margin: '0 -4px', padding: '0 4px' }}>
            {availableTickers.map((code) => {
              const sel = ticker === code
              const price = prices?.[code]
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTicker(code)}
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
                  <div style={{ fontSize: 13, fontWeight: 800, color: sel ? 'var(--rose-600)' : 'var(--foreground)' }}>
                    {code}
                  </div>
                  {price !== undefined && (
                    <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
                      ${fmtUsd(price)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        ) : availableTickers.length === 1 ? (
          /* PRIVACY: 고정 카드 */
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            border: '1px solid var(--border)', background: 'var(--muted)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, fontWeight: 800 }}>{availableTickers[0]}</span>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
                background: 'var(--muted-foreground)', color: 'var(--card)', letterSpacing: '0.06em',
              }}>고정</span>
            </div>
            {prices?.[availableTickers[0]] !== undefined && (
              <span style={{ fontSize: 12, color: 'var(--muted-foreground)', fontVariantNumeric: 'tabular-nums' }}>
                ${fmtUsd(prices![availableTickers[0]])}
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>선택 가능한 종목이 없습니다.</p>
        )}
      </div>

      {/* ── C. 사용 비율 (신규 전용) ── */}
      {!initial && (
        <div style={{ padding: '18px 0 18px', borderBottom: '1px solid var(--border)' }}>
          <FieldLabel hint="USD 예수금 기준 · 드래그하거나 입력">사용 비율</FieldLabel>

          {loadingBase ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--muted-foreground)', fontSize: 12, padding: '12px 0' }}>
              <Loader2 size={14} className="animate-spin" />
              예수금 조회 중...
            </div>
          ) : (
            <>
              <PercentGauge
                value={pct}
                onChange={setPct}
                deposit={usdDeposit}
                disabled={loading}
              />

              {/* 검증 표시 */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, marginTop: 12 }}>
                {isBelowMinSeed && minSeed !== null ? (
                  <>
                    <span style={{ width: 14, height: 14, color: 'var(--warn)' }}><AlertTriangle size={14} /></span>
                    <span style={{ color: 'var(--warn)' }}>최소 ${fmtUsd(minSeed)} 필요</span>
                  </>
                ) : !isInfinite && privacyBase === null ? (
                  <>
                    <span style={{ width: 14, height: 14, color: 'var(--warn)' }}><AlertTriangle size={14} /></span>
                    <span style={{ color: 'var(--warn)' }}>기준 매매표가 없습니다</span>
                  </>
                ) : basePrice !== null ? (
                  <>
                    <span style={{ width: 14, height: 14, color: 'var(--status-ok)' }}><Check size={14} /></span>
                    <span style={{ color: 'var(--status-ok)' }}>유효한 입력</span>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── D. 사이클 연속여부 ── */}
      <div style={{ padding: '18px 0 0' }}>
        <FieldLabel hint="ON일 때 시드 모드 필수">사이클 연속여부</FieldLabel>

        {/* 자동 시작 토글 행 */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--border)', background: 'var(--card)',
          marginBottom: 14,
        }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>다음 사이클 자동 시작</div>
            <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', marginTop: 2 }}>익절 종료 후 새 사이클을 자동 개시합니다.</div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={() => setAutoStart((v) => !v)}
            style={{
              width: 38, height: 22, borderRadius: 999,
              background: autoStart ? 'var(--rose-500)' : 'var(--muted)',
              border: 'none',
              position: 'relative', cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'background .2s',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
            }}
            aria-pressed={autoStart}
            aria-label="다음 사이클 자동 시작"
          >
            <div style={{
              position: 'absolute', top: 3,
              left: autoStart ? 18 : 4,
              width: 16, height: 16, borderRadius: 999,
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              transition: 'left .2s',
            }} />
          </button>
        </div>

        {/* 시드 모드 세그먼트 (자동 시작 ON일 때만) */}
        {autoStart && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)', marginBottom: 6, letterSpacing: '0.04em' }}>
              시드 모드
            </div>
            <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--muted)', borderRadius: 10 }}>
              {([
                { code: 'KEEP', label: '시드 유지', sub: '기존 시드만 사용' },
                { code: 'MAX', label: '시드 MAX', sub: '예수금까지 전체 활용' },
              ] as const).map((m) => {
                const active = seedMode === m.code
                return (
                  <button
                    key={m.code}
                    type="button"
                    disabled={loading}
                    onClick={() => setSeedMode(m.code)}
                    style={{
                      flex: 1, padding: '10px 12px', border: 'none', borderRadius: 7,
                      cursor: loading ? 'not-allowed' : 'pointer', textAlign: 'center',
                      background: active ? 'var(--card)' : 'transparent',
                      boxShadow: active ? 'var(--sh-card)' : 'none',
                      transition: 'background .15s, box-shadow .15s',
                    }}
                  >
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: active ? 'var(--rose-600)' : 'var(--muted-foreground)' }}>
                      {m.label}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>{m.sub}</div>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 푸터 버튼 ── */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 20 }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              flex: 1, height: 42, borderRadius: 'var(--r-md)',
              border: '1px solid var(--border)', background: 'var(--card)',
              fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              color: 'var(--foreground)',
            }}
          >
            취소
          </button>
        )}
        <Button
          type="submit"
          style={{ flex: onCancel ? 1.4 : 1, height: 42 }}
          disabled={loading || cannotSubmit}
        >
          {loading ? '저장 중...' : initial ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  )
}
