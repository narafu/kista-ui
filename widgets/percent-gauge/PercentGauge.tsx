'use client'

import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'
import { SeedAmountInput } from './SeedAmountInput'

interface Props {
  value: number
  onChange: (value: number) => void
  deposit: number | null
  minSeed?: number | null
  compact?: boolean
  disabled?: boolean
  balanceCheckEnabled?: boolean
  seedUsdInput?: number | null
  onSeedUsdChange?: (v: number | null) => void
}

export function PercentGauge({ value, onChange, deposit, minSeed, compact, disabled, balanceCheckEnabled = true, seedUsdInput, onSeedUsdChange }: Props) {
  if (!balanceCheckEnabled) {
    return (
      <SeedAmountInput
        value={seedUsdInput ?? null}
        onChange={onSeedUsdChange ?? (() => {})}
        deposit={deposit}
        minSeed={minSeed ?? null}
        disabled={disabled}
      />
    )
  }

  const handleSize = compact ? 18 : 22
  const halfHandle = handleSize / 2
  const trackH = compact ? 8 : 10
  const allocated = deposit !== null ? Math.round(deposit * value) / 100 : null

  const depositInsufficient = balanceCheckEnabled && deposit != null && minSeed != null && deposit < minSeed
  const allDisabled = disabled || depositInsufficient

  const minPct =
    deposit != null && minSeed != null && deposit > 0
      ? Math.min(100, Math.ceil((minSeed / deposit) * 100))
      : null

  return (
    <div className="min-w-0">
      {/* 숫자 입력 행: [MIN] [입력칸] [MAX] */}
      <div className={cn('flex gap-1.5 items-center justify-around', compact ? 'mb-3' : 'mb-3.5')}>
        {/* MIN 버튼 */}
        {minPct !== null && (
          <button
            type="button"
            disabled={allDisabled}
            onClick={() => onChange(minPct)}
            className={cn(
              'px-3 rounded-lg border border-border bg-muted text-xs font-bold tracking-[0.05em]',
              compact ? 'h-[38px]' : 'h-10',
              allDisabled ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'text-foreground cursor-pointer'
            )}
          >
            MIN
          </button>
        )}

        {/* 퍼센트 입력칸 */}
        <div
          className={cn(
            'flex-1 relative rounded-lg border border-[var(--rose-400)] bg-card flex items-center px-3.5 w-[65%]',
            compact ? 'h-[38px]' : 'h-10',
            allDisabled ? 'opacity-50' : 'shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
          )}
        >
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="사용 비율 (%)"
            value={String(value)}
            disabled={allDisabled}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '')
              if (raw === '') { onChange(0); return }
              onChange(Math.min(100, Math.max(0, Math.round(Number(raw)))))
            }}
            className="flex-1 border-0 outline-none bg-transparent font-extrabold text-foreground text-right min-w-0"
            style={{ fontSize: compact ? 16 : 18, fontFamily: 'inherit' }}
          />
          <span className="text-sm font-extrabold text-[var(--rose-600)] ml-1">%</span>
        </div>

        {/* MAX 버튼 */}
        <button
          type="button"
          disabled={allDisabled}
          onClick={() => onChange(100)}
          style={{
            background: allDisabled
              ? 'var(--muted)'
              : 'linear-gradient(135deg, var(--rose-400), var(--rose-600))',
          }}
          className={cn(
            'px-3.5 rounded-lg border border-[var(--rose-400)] text-xs font-bold tracking-[0.05em]',
            compact ? 'h-[38px]' : 'h-10',
            allDisabled ? 'text-muted-foreground cursor-not-allowed opacity-50' : 'text-white cursor-pointer'
          )}
        >
          MAX
        </button>
      </div>

      {/* 슬라이더 트랙 */}
      <div className="flex gap-2 items-center mb-2.5">
        {/* - 버튼 */}
        <button
          type="button"
          disabled={allDisabled || value <= 0}
          onClick={() => onChange(Math.max(0, value - 1))}
          className={cn(
            'shrink-0 size-7 rounded-md border border-border bg-muted text-sm font-bold leading-none grid place-items-center',
            allDisabled || value <= 0 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/80'
          )}
          aria-label="1% 감소"
        >
          −
        </button>

        <div
          className={cn('flex-1 relative', allDisabled && 'opacity-50')}
          style={{ height: handleSize + 4, paddingLeft: halfHandle, paddingRight: halfHandle }}
        >
          {/* tick 마크 */}
          <div
            className="absolute inset-x-0 h-[3px] flex justify-between pointer-events-none"
            style={{ top: (handleSize + 4) / 2 - trackH / 2 - 3 }}
          >
            {[0, 25, 50, 75, 100].map((t) => (
              <span key={t} className="w-px h-[3px] bg-[var(--border-strong)] opacity-60" />
            ))}
          </div>

          {/* 트랙 배경 */}
          <div
            className="absolute inset-x-0 rounded-full bg-muted border border-border"
            style={{ top: (handleSize + 4) / 2 - trackH / 2, height: trackH }}
          >
            {/* 채워진 트랙 */}
            <div
              className="absolute inset-y-[-1px] left-0 rounded-full border border-[var(--rose-500)]"
              style={{
                width: `${value}%`,
                background: 'linear-gradient(90deg, var(--rose-300), var(--rose-500))',
              }}
            />
          </div>

          {/* 핸들 */}
          <div
            className="absolute top-0 -translate-x-1/2 rounded-full bg-white border-2 border-[var(--rose-500)] shadow-[0_2px_6px_rgba(143,68,48,0.28)] grid place-items-center pointer-events-none"
            style={{ left: `${value}%`, width: handleSize, height: handleSize }}
          >
            <span className="size-1 rounded-full bg-[var(--rose-500)]" />
          </div>

          {/* 실제 range input (투명, 위에 씌움) */}
          <input
            type="range"
            aria-label="사용 비율 슬라이더"
            min={0}
            max={100}
            step={1}
            value={value}
            disabled={allDisabled}
            onChange={(e) => onChange(Number(e.target.value))}
            className={cn(
              'absolute inset-0 w-full opacity-0 m-0 touch-pan-y',
              allDisabled ? 'cursor-not-allowed' : 'cursor-pointer'
            )}
          />
        </div>

        {/* + 버튼 */}
        <button
          type="button"
          disabled={allDisabled || value >= 100}
          onClick={() => onChange(Math.min(100, value + 1))}
          className={cn(
            'shrink-0 size-7 rounded-md border border-border bg-muted text-sm font-bold leading-none grid place-items-center',
            allDisabled || value >= 100 ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/80'
          )}
          aria-label="1% 증가"
        >
          +
        </button>
      </div>

      {/* tick 라벨 — -/+ 버튼(28px) + gap(8px) + 핸들 반경(halfHandle)만큼 들여쓰기 */}
      <div
        className="flex justify-between text-[10px] text-muted-foreground font-semibold mb-3"
        style={{ paddingLeft: 28 + 8 + halfHandle, paddingRight: 28 + 8 + halfHandle }}
      >
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* 사용 금액 미리보기 / 예수금 부족 경고 */}
      {deposit !== null &&
        (depositInsufficient && minSeed !== null ? (
          <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn)]">
            <span className="text-[11px] text-[var(--warn)] font-bold">예수금 부족</span>
            <span
              className={cn('font-extrabold text-[var(--warn)] tabular-nums', compact ? 'text-[12px]' : 'text-[13px]')}
            >
              필요: ${fmtUsd(minSeed)}
              <span className="text-[10.5px] font-semibold text-[var(--warn)] ml-1.5 opacity-80">
                / 보유: ${fmtUsd(deposit)}
              </span>
            </span>
          </div>
        ) : (
          <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--brand-soft-bg)] border border-[var(--rose-200)]">
            <span className="text-[11px] text-[var(--brand-fg-soft)] font-bold">사용 금액 예상</span>
            <span
              className="font-extrabold text-[var(--brand-fg)] tabular-nums"
              style={{ fontSize: compact ? 12.5 : 13.5 }}
            >
              ${allocated !== null ? fmtUsd(allocated) : '--'}
              <span className="text-[10.5px] font-semibold text-muted-foreground ml-1.5">
                / ${fmtUsd(deposit)}
              </span>
            </span>
          </div>
        ))}
    </div>
  )
}
