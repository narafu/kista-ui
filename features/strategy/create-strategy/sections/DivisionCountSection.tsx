'use client'

import { cn } from '@shared/lib/utils'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { DivisionCount } from '../model/strategyFormSchema'

interface Props {
  visible: boolean
  divisionCount: DivisionCount
  setDivisionCount: (n: DivisionCount) => void
  loading: boolean
  isEdit: boolean
}

const DIVISION_COUNT_OPTIONS = [20, 30, 40] as const

export function DivisionCountSection({ visible, divisionCount, setDivisionCount, loading, isEdit }: Props) {
  if (!visible) return null

  return (
    <div className="pt-[18px]">
      <StrategyFieldLabel hint="">분할 수</StrategyFieldLabel>
      <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
        {DIVISION_COUNT_OPTIONS.map((value) => {
          const active = divisionCount === value
          const disabled = loading || isEdit
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => !isEdit && setDivisionCount(value)}
              className={cn('flex-1 px-3 py-2.5 border-none rounded-[7px] text-center transition-[background,box-shadow] duration-150', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
              style={{
                background: active ? 'var(--card)' : 'transparent',
                boxShadow: active ? 'var(--sh-card)' : 'none',
              }}
            >
              <div className="text-sm font-bold" style={{ color: active ? 'var(--rose-600)' : 'var(--muted-foreground)' }}>
                {value}분할
              </div>
            </button>
          )
        })}
      </div>
      {isEdit && <p className="text-sm text-muted-foreground mt-1.5 px-1">분할 수는 등록 후 변경할 수 없습니다.</p>}
    </div>
  )
}
