'use client'

interface Props {
  value: number
  onChange: (value: number) => void
  deposit: number | null
  compact?: boolean
  disabled?: boolean
}

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function PercentGauge({ value, onChange, deposit, compact, disabled }: Props) {
  const handleSize = compact ? 18 : 22
  const trackH = compact ? 8 : 10
  const allocated = deposit !== null ? Math.round(deposit * value) / 100 : null

  return (
    <div>
      {/* 숫자 입력 행 + MAX 버튼 */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: compact ? 12 : 14 }}>
        <div style={{
          flex: 1, position: 'relative',
          height: compact ? 38 : 40, borderRadius: 8,
          border: '1px solid var(--rose-400)', background: 'var(--card)',
          boxShadow: '0 0 0 3px rgba(203,131,106,0.18)',
          display: 'flex', alignItems: 'center', padding: '0 14px',
          opacity: disabled ? 0.6 : 1,
        }}>
          <input
            type="number"
            min={0}
            max={100}
            step={5}
            value={value}
            disabled={disabled}
            onChange={(e) => {
              const v = Math.min(100, Math.max(0, Number(e.target.value)))
              onChange(Math.round(v / 5) * 5)
            }}
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontWeight: 800, fontSize: compact ? 16 : 18, fontFamily: 'inherit',
              color: 'var(--foreground)', textAlign: 'right', minWidth: 0,
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--rose-600)', marginLeft: 4 }}>%</span>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(100)}
          style={{
            height: compact ? 38 : 40, padding: '0 14px', borderRadius: 8,
            border: '1px solid var(--rose-400)',
            background: disabled ? 'var(--muted)' : 'linear-gradient(135deg, var(--rose-400), var(--rose-600))',
            color: disabled ? 'var(--muted-foreground)' : '#fff',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.05em', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          MAX
        </button>
      </div>

      {/* 슬라이더 트랙 */}
      <div style={{ position: 'relative', height: handleSize + 4, marginBottom: 10 }}>
        {/* tick 마크 */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: (handleSize + 4) / 2 - trackH / 2 - 3,
          height: 3, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none',
        }}>
          {[0, 25, 50, 75, 100].map((t) => (
            <span key={t} style={{ width: 1, height: 3, background: 'var(--border-strong)', opacity: 0.6 }} />
          ))}
        </div>

        {/* 트랙 배경 */}
        <div style={{
          position: 'absolute', left: 0, right: 0,
          top: (handleSize + 4) / 2 - trackH / 2,
          height: trackH, borderRadius: 999,
          background: 'var(--muted)', border: '1px solid var(--border)',
        }}>
          <div style={{
            position: 'absolute', left: 0, top: -1, bottom: -1,
            width: `${value}%`, borderRadius: 999,
            background: 'linear-gradient(90deg, var(--rose-300), var(--rose-500))',
            border: '1px solid var(--rose-500)',
          }} />
        </div>

        {/* 핸들 */}
        <div style={{
          position: 'absolute', top: 0, left: `${value}%`, transform: 'translateX(-50%)',
          width: handleSize, height: handleSize, borderRadius: 999,
          background: '#fff', border: '2px solid var(--rose-500)',
          boxShadow: '0 2px 6px rgba(143,68,48,0.28)',
          display: 'grid', placeItems: 'center',
          pointerEvents: 'none',
        }}>
          <span style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--rose-500)' }} />
        </div>

        {/* 실제 range input (투명, 위에 씌움) */}
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{
            position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
            width: '100%', opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', margin: 0,
          }}
        />
      </div>

      {/* tick 라벨 */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: 'var(--muted-foreground)', fontWeight: 600, marginBottom: 12,
      }}>
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* 사용 금액 미리보기 */}
      {deposit !== null && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '10px 12px', borderRadius: 'var(--r-sm)',
          background: 'var(--brand-soft-bg)', border: '1px solid var(--rose-200)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--brand-fg-soft)', fontWeight: 700 }}>사용 금액 예상</span>
          <span style={{ fontSize: compact ? 12.5 : 13.5, fontWeight: 800, color: 'var(--brand-fg)', fontVariantNumeric: 'tabular-nums' }}>
            ${allocated !== null ? fmtUsd(allocated) : '--'}
            <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--muted-foreground)', marginLeft: 6 }}>
              / ${fmtUsd(deposit)}
            </span>
          </span>
        </div>
      )}
    </div>
  )
}
