'use client'

import { useRef, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@shared/lib/utils'
import { fmtUsd } from '@shared/lib/format'

interface Props {
  value: number
  onChange: (value: number) => void
  deposit: number | null
  minSeed?: number | null
  disabled?: boolean
}

function calcAllocated(deposit: number | null, value: number): number | null {
  if (deposit === null) return null
  return value === 100 ? Math.floor(deposit) : Math.ceil((deposit * value) / 100)
}

function calcMinPct(deposit: number | null | undefined, minSeed: number | null | undefined): number | null {
  if (deposit == null || minSeed == null || deposit <= 0) return null
  return Math.min(100, Math.ceil((minSeed / deposit) * 100))
}

interface InputRowProps {
  value: number
  onChange: (value: number) => void
  minPct: number | null
  allDisabled: boolean | undefined
}

// MIN·MAX는 같은 급의 프리셋이라 같은 outline — brand는 화면당 최상위 CTA 전용(docs/agents/features.md). 높이는 같은 폼 입력칸(h-11)에 맞춘다
function PercentInputRow({ value, onChange, minPct, allDisabled }: InputRowProps) {
  return (
    <div className="flex gap-1.5 items-center justify-around mb-3.5">
      {minPct !== null && (
        <Button type="button" variant="outline" className="h-11" disabled={allDisabled} onClick={() => onChange(minPct)}>
          MIN
        </Button>
      )}

      {/* 퍼센트 입력칸 — %를 품은 컨테이너가 테두리를 그리므로 안쪽은 공용 Input이 아닌 투명 raw input */}
      <div
        className={cn(
          'flex-1 relative rounded-lg border border-[var(--rose-400)] bg-card flex items-center px-3.5 w-[65%] h-11',
          // 상시 rose 강조와 별개로 포커스는 공용 Input과 같은 ring을 덧씌운다
          allDisabled ? 'opacity-50' : 'shadow-[0_0_0_3px_rgba(203,131,106,0.18)] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
        )}
      >
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          aria-label="사용 비율 (%)"
          value={String(value)}
          disabled={allDisabled}
          maxLength={3}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, '')
            if (raw === '') { onChange(0); return }
            onChange(Math.min(100, Number(raw)))
          }}
          className="flex-1 border-0 outline-none bg-transparent font-extrabold text-foreground text-right min-w-0 text-lg"
        />
        <span className="text-sm font-extrabold text-[var(--rose-600)] ml-1">%</span>
      </div>

      <Button type="button" variant="outline" className="h-11" disabled={allDisabled} onClick={() => onChange(100)}>
        MAX
      </Button>
    </div>
  )
}

interface StepButtonProps {
  disabled: boolean | undefined
  onClick: () => void
  label: string
  children: ReactNode
}

function StepButton({ disabled, onClick, label, children }: StepButtonProps) {
  return (
    <Button type="button" variant="outline" size="icon-sm" disabled={disabled} onClick={onClick} aria-label={label}>
      {children}
    </Button>
  )
}

interface SliderRowProps {
  value: number
  onChange: (value: number) => void
  allDisabled: boolean | undefined
  handleSize: number
  halfHandle: number
  trackH: number
}

function SliderRow({ value, onChange, allDisabled, handleSize, halfHandle, trackH }: SliderRowProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const rangeRef = useRef<HTMLInputElement>(null)

  function getValueFromClientX(clientX: number): number {
    if (!trackRef.current) return value
    const rect = trackRef.current.getBoundingClientRect()
    const trackLeft = rect.left + halfHandle
    const trackWidth = rect.width - halfHandle * 2
    const pct = ((clientX - trackLeft) / trackWidth) * 100
    return Math.min(100, Math.max(0, Math.round(pct)))
  }

  return (
    <div className="flex gap-2 items-center mb-2.5">
      <StepButton disabled={allDisabled || value <= 0} onClick={() => onChange(Math.max(0, value - 1))} label="1% 감소">
        <Minus />
      </StepButton>

      {/* 드래그 가능한 트랙 영역 */}
      <div
        ref={trackRef}
        className={cn(
          'flex-1 relative select-none touch-none',
          allDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
        )}
        style={{ height: handleSize + 4, paddingLeft: halfHandle, paddingRight: halfHandle }}
        onPointerDown={(e) => {
          if (allDisabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          onChange(getValueFromClientX(e.clientX))
          rangeRef.current?.focus()
        }}
        onPointerMove={(e) => {
          if (allDisabled || !e.currentTarget.hasPointerCapture(e.pointerId)) return
          onChange(getValueFromClientX(e.clientX))
        }}
        onPointerUp={(e) => { e.currentTarget.releasePointerCapture(e.pointerId) }}
        onPointerCancel={(e) => { e.currentTarget.releasePointerCapture(e.pointerId) }}
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
            className="absolute inset-y-[-1px] left-0 rounded-full border border-[var(--rose-500)] bg-gradient-to-r from-[var(--rose-300)] to-[var(--rose-500)]"
            style={{ width: `${value}%` }}
          />
        </div>

        {/* 핸들 */}
        <div
          className="absolute top-0 -translate-x-1/2 rounded-full bg-white border-2 border-[var(--rose-500)] shadow-[0_2px_6px_rgba(143,68,48,0.28)] grid place-items-center pointer-events-none"
          style={{ left: `${value}%`, width: handleSize, height: handleSize }}
        >
          <span className="size-1 rounded-full bg-[var(--rose-500)]" />
        </div>

        {/* 키보드 접근성용 range input (포인터 이벤트 비활성) */}
        <input
          ref={rangeRef}
          type="range"
          aria-label="사용 비율 슬라이더"
          min={0}
          max={100}
          step={1}
          value={value}
          disabled={allDisabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 pointer-events-none m-0"
        />
      </div>

      <StepButton disabled={allDisabled || value >= 100} onClick={() => onChange(Math.min(100, value + 1))} label="1% 증가">
        <Plus />
      </StepButton>
    </div>
  )
}

interface PreviewProps {
  deposit: number
  minSeed?: number | null
  depositInsufficient: boolean
  allocated: number | null
}

function AmountPreview({ deposit, minSeed, depositInsufficient, allocated }: PreviewProps) {
  if (depositInsufficient && minSeed != null) {
    return (
      <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--warn-bg)] border border-[var(--warn)]">
        <span className="text-sm text-[var(--warn)] font-bold">예수금 부족</span>
        <span
          className="font-extrabold text-[var(--warn)] tabular-nums text-sm"
        >
          필요: ${fmtUsd(minSeed)}
          <span className="text-sm font-semibold text-[var(--warn)] ml-1.5 opacity-80">
            / 보유: ${fmtUsd(deposit)}
          </span>
        </span>
      </div>
    )
  }
  return (
    <div className="flex justify-between items-center px-3 py-2.5 rounded-[var(--r-sm)] bg-[var(--brand-soft-bg)] border border-[var(--rose-200)]">
      <span className="text-sm text-[var(--brand-fg-soft)] font-bold">사용 금액 예상</span>
      <span
        className="font-extrabold text-[var(--brand-fg)] tabular-nums text-sm"
      >
        ${allocated !== null ? fmtUsd(allocated) : '--'}
        <span className="text-sm font-semibold text-muted-foreground ml-1.5">
          / ${fmtUsd(deposit)}
        </span>
      </span>
    </div>
  )
}

export function PercentGauge({ value, onChange, deposit, minSeed, disabled }: Props) {
  const handleSize = 22
  const halfHandle = handleSize / 2
  const trackH = 10
  const allocated = calcAllocated(deposit, value)

  const depositInsufficient = deposit != null && minSeed != null && deposit < minSeed
  const allDisabled = disabled || depositInsufficient
  const minPct = calcMinPct(deposit, minSeed)

  return (
    <div className="min-w-0">
      <PercentInputRow value={value} onChange={onChange} minPct={minPct} allDisabled={allDisabled} />

      <SliderRow
        value={value}
        onChange={onChange}
        allDisabled={allDisabled}
        handleSize={handleSize}
        halfHandle={halfHandle}
        trackH={trackH}
      />

      {/* tick 라벨 — -/+ 버튼(28px) + gap(8px) + 핸들 반경(halfHandle)만큼 들여쓰기 */}
      <div
        className="flex justify-between text-xs text-muted-foreground font-semibold mb-3"
        style={{ paddingLeft: 28 + 8 + halfHandle, paddingRight: 28 + 8 + halfHandle }}
      >
        <span>0%</span>
        <span>25%</span>
        <span>50%</span>
        <span>75%</span>
        <span>100%</span>
      </div>

      {/* 사용 금액 미리보기 / 예수금 부족 경고 */}
      {deposit !== null && (
        <AmountPreview
          deposit={deposit}
          minSeed={minSeed}
          depositInsufficient={depositInsufficient}
          allocated={allocated}
        />
      )}
    </div>
  )
}
