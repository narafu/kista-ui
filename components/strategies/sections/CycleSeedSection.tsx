'use client'

import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  autoStart: boolean
  setAutoStart: (v: boolean) => void
  seedMode: 'KEEP' | 'MAX'
  setSeedMode: (m: 'KEEP' | 'MAX') => void
  loading: boolean
}

const SEED_MODES = [
  { code: 'KEEP', label: '시드 유지', sub: '기존 시드만 사용' },
  { code: 'MAX', label: '시드 MAX', sub: '예수금까지 전체 활용' },
] as const

export function CycleSeedSection({ autoStart, setAutoStart, seedMode, setSeedMode, loading }: Props) {
  return (
    <div style={{ padding: '18px 0 0' }}>
      <StrategyFieldLabel hint="">사이클 연속여부</StrategyFieldLabel>

      {/* 자동 시작 토글 */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 14px', borderRadius: 'var(--r-sm)',
          border: '1px solid var(--border)', background: 'var(--card)', marginBottom: 14,
        }}
      >
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--foreground)' }}>
            다음 사이클 자동 시작
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)', marginTop: 2 }}>
            익절 종료 후 새 사이클을 자동 개시합니다.
          </div>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => setAutoStart(!autoStart)}
          style={{
            width: 38, height: 22, borderRadius: 999,
            background: autoStart ? 'var(--rose-500)' : 'var(--muted)',
            border: 'none', position: 'relative',
            cursor: loading ? 'not-allowed' : 'pointer',
            flexShrink: 0, transition: 'background .2s',
            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.08)',
          }}
          aria-pressed={autoStart}
          aria-label="다음 사이클 자동 시작"
        >
          <div
            style={{
              position: 'absolute', top: 3, left: autoStart ? 18 : 4,
              width: 16, height: 16, borderRadius: 999,
              background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
              transition: 'left .2s',
            }}
          />
        </button>
      </div>

      {/* 시드 모드 세그먼트 */}
      {autoStart && (
        <>
          <div
            style={{
              fontSize: 11, fontWeight: 700, color: 'var(--muted-foreground)',
              marginBottom: 6, letterSpacing: '0.04em',
            }}
          >
            시드 모드
          </div>
          <div
            style={{
              display: 'flex', gap: 4, padding: 3,
              background: 'var(--muted)', borderRadius: 10,
            }}
          >
            {SEED_MODES.map((m) => {
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
                  <div
                    style={{
                      fontSize: 12.5, fontWeight: 700,
                      color: active ? 'var(--rose-600)' : 'var(--muted-foreground)',
                    }}
                  >
                    {m.label}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted-foreground)', marginTop: 2 }}>
                    {m.sub}
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
