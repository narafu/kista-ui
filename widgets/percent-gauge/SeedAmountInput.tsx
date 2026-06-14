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

  return (
    <div className="min-w-0">
      {/* 입력칸 — 전체 너비 */}
      <div
        className={cn(
          'w-full rounded-lg border bg-card flex items-center px-3.5 h-10 mb-1.5',
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
            onChange(Math.max(0, Math.round(Number(raw))))
          }}
          className="flex-1 border-0 outline-none bg-transparent font-extrabold text-foreground text-right min-w-0 text-[18px]"
        />
        <span className="text-xs font-semibold text-muted-foreground ml-1.5">USD</span>
      </div>

      {/* 최소시드 버튼 — 다음 행, 전체 너비 */}
      <button
        type="button"
        disabled={disabled || minSeed === null}
        onClick={() => minSeed !== null && onChange(minSeed)}
        style={{
          background:
            disabled || minSeed === null
              ? 'var(--muted)'
              : 'linear-gradient(135deg, var(--rose-400), var(--rose-600))',
        }}
        className={cn(
          'w-full h-9 rounded-lg border border-[var(--rose-400)] text-xs font-bold tracking-[0.05em] mb-3',
          disabled || minSeed === null
            ? 'text-muted-foreground cursor-not-allowed opacity-50'
            : 'text-white cursor-pointer',
        )}
      >
        최소시드
      </button>

      {/* 잔고검증 OFF 배지 */}
      <div className="flex items-center justify-end mb-2">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{
            background: 'var(--rose-50, rgba(251,207,232,.15))',
            color: 'var(--rose-500)',
            borderColor: 'var(--rose-300)',
          }}
        >
          잔고검증 OFF
        </span>
      </div>

      {/* 정보 박스 */}
      {deposit === null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-[11px] text-muted-foreground font-bold">예수금 조회 불가</span>
          <span className="text-[10.5px] text-muted-foreground">KIS 연결 확인 필요</span>
        </div>
      ) : shortage !== null ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn)]">
          <span className="text-[11px] text-[var(--warn)] font-bold">추가 입금 필요</span>
          <span className="text-[13px] font-extrabold text-[var(--warn)] tabular-nums">
            ${fmtUsd(shortage)}
            <span className="text-[10.5px] font-semibold opacity-80 ml-1.5">
              보유 ${fmtUsd(deposit)}
            </span>
          </span>
        </div>
      ) : sufficient ? (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--brand-soft-bg)] border border-[var(--rose-200)]">
          <span className="text-[11px] text-[var(--brand-fg-soft)] font-bold">예수금으로 즉시 시작 가능</span>
          <span className="text-[13px] font-extrabold text-[var(--brand-fg)] tabular-nums">✓</span>
        </div>
      ) : (
        <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-muted border border-border">
          <span className="text-[11px] text-muted-foreground font-bold">시드 금액 입력</span>
          {minSeed !== null && (
            <span className="text-[10.5px] text-muted-foreground">최소 ${fmtUsd(minSeed)}</span>
          )}
        </div>
      )}
    </div>
  )
}
