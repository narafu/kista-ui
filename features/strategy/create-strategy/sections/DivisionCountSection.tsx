'use client'

import { cn } from '@shared/lib/utils'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  isInfinite: boolean
  divisionCount: number
  setDivisionCount: (n: number) => void
  loading: boolean
  isEdit: boolean
}

const DIVISION_OPTIONS = [
  { value: 20, label: '20분할' },
  // { value: 30, label: '30분할' },
  // { value: 40, label: '40분할' },
] as const

export function DivisionCountSection({ isInfinite, divisionCount, setDivisionCount, loading, isEdit }: Props) {
  if (!isInfinite) return null

  return (
    <div className="pt-[18px]">
      <StrategyFieldLabel hint="">분할 수</StrategyFieldLabel>
      <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
        {DIVISION_OPTIONS.map((opt) => {
          const active = divisionCount === opt.value
          const disabled = loading || isEdit
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => !isEdit && setDivisionCount(opt.value)}
              className={cn('flex-1 px-3 py-2.5 border-none rounded-[7px] text-center transition-[background,box-shadow] duration-150', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
              style={{
                background: active ? 'var(--card)' : 'transparent',
                boxShadow: active ? 'var(--sh-card)' : 'none',
              }}
            >
              <div className="text-sm font-bold" style={{ color: active ? 'var(--rose-600)' : 'var(--muted-foreground)' }}>
                {opt.label}
              </div>
            </button>
          )
        })}
      </div>
      {isEdit && <p className="text-xs text-muted-foreground mt-1.5 px-1">분할 수는 등록 후 변경할 수 없습니다.</p>}
    </div>
  )
}
