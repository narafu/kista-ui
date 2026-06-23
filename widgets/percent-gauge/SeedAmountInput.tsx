'use client'

import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'

interface Props {
  value: number | null
  onChange: (v: number | null) => void
  deposit: number | null
  minSeed: number | null
  disabled?: boolean
}

export function SeedAmountInput({ value, onChange, deposit, minSeed, disabled }: Props) {
  const shortage =
    deposit !== null && value !== null && value > 0 && deposit < value
      ? value - deposit
      : null
  const sufficient = deposit !== null && value !== null && value > 0 && deposit >= value

  const step = minSeed ?? 0
  const canDecrease = !disabled && step > 0 && value !== null && value > step
  const canIncrease = !disabled && step > 0

  function handleDecrease() {
    if (!canDecrease || value === null) return
    onChange(Math.ceil(Math.max(step, value - step)))
  }

  function handleIncrease() {
    if (!canIncrease) return
    onChange(Math.ceil((value ?? step) + step))
  }

  return (
    <div className="min-w-0">
      {/* 스테퍼 행: [-] [입력칸] [+] */}
      <div className="flex gap-1.5 items-center mb-3">
        {/* - 버튼 */}
        <button
          type="button"
          disabled={!canDecrease}
          onClick={handleDecrease}
          className={cn(
            'shrink-0 size-10 rounded-lg border border-border bg-muted text-lg font-bold leading-none grid place-items-center',
            !canDecrease ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/80'
          )}
          aria-label="최소시드 단위 감소"
        >
          −
        </button>

        {/* 입력칸 */}
        <div
          className={cn(
            'flex-1 min-w-0 rounded-lg border bg-card flex items-center px-3.5 h-10',
            disabled ? 'opacity-50' : 'border-[var(--rose-400)] shadow-[0_0_0_3px_rgba(203,131,106,0.18)]',
          )}
        >
          <span className="text-sm font-extrabold text-[var(--rose-600)] mr-1.5">$</span>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label="시드 금액 (USD)"
            value={value !== null ? String(value) : ''}
            disabled={disabled}
            placeholder="0"
            onChange={(e) => {
              const raw = e.target.value.replace(/[^\d]/g, '')
              if (raw === '') { onChange(null); return }
              onChange(Number(raw))
            }}
            className="flex-1 border-0 outline-none bg-transparent font-extrabold text-foreground text-right min-w-0 text-lg"
          />
          <span className="text-xs font-semibold text-muted-foreground ml-1.5">USD</span>
        </div>

        {/* + 버튼 */}
        <button
          type="button"
          disabled={!canIncrease}
          onClick={handleIncrease}
          className={cn(
            'shrink-0 size-10 rounded-lg border border-border bg-muted text-lg font-bold leading-none grid place-items-center',
            !canIncrease ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/80'
          )}
          aria-label="최소시드 단위 증가"
        >
          +
        </button>
      </div>

      {/* 정보 박스 */}
      {deposit === null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-bold">예수금 조회 불가</span>
          <span className="text-sm text-muted-foreground">KIS 연결 확인 필요</span>
        </div>
      ) : minSeed !== null && value !== null && value > 0 && value < minSeed ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn)]">
          <span className="text-sm text-[var(--warn)] font-bold">최소 시드 미달</span>
          <span className="text-sm font-extrabold text-[var(--warn)] tabular-nums">
            최소 ${fmtUsd(minSeed)}
          </span>
        </div>
      ) : shortage !== null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-medium">추가 입금 필요</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            ${fmtUsd(shortage)}
            <span className="text-sm font-normal opacity-60 ml-1.5">
              보유 ${fmtUsd(deposit)}
            </span>
          </span>
        </div>
      ) : sufficient ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--brand-soft-bg)] border border-[var(--rose-200)]">
          <span className="text-sm text-[var(--brand-fg-soft)] font-bold">예수금으로 즉시 시작 가능</span>
          <span className="text-sm font-extrabold text-[var(--brand-fg)] tabular-nums">✓</span>
        </div>
      ) : (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-sm text-muted-foreground font-bold">시드 금액 입력</span>
          {minSeed !== null && (
            <span className="text-sm text-muted-foreground">최소 ${fmtUsd(minSeed)}</span>
          )}
        </div>
      )}
    </div>
  )
}
