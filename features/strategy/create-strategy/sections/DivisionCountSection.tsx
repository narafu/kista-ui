'use client'

import { cn } from '@shared/lib/utils'
import { StrategyFieldLabel } from '../StrategyFieldLabel'

interface Props {
  visible: boolean
  options: number[]
  divisionCount: number
  setDivisionCount: (n: number) => void
  loading: boolean
  isEdit: boolean
}

export function DivisionCountSection({ visible, options, divisionCount, setDivisionCount, loading, isEdit }: Props) {
  if (!visible || options.length === 0) return null

  return (
    <div className="pt-[18px]">
      <StrategyFieldLabel hint="">분할 수</StrategyFieldLabel>
      <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
        {options.map((value) => {
          const active = divisionCount === value
          const disabled = loading || isEdit
          return (
            <button
              key={value}
              type="button"
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
