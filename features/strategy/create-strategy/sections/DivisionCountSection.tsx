'use client'

import { SelectionCard } from '@shared/ui/selection-card'
import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { DivisionCount } from '../model/strategyFormSchema'

interface Props {
  visible: boolean
  divisionCount: DivisionCount
  setDivisionCount: (n: DivisionCount) => void
  loading: boolean
  isEdit: boolean
  options: number[]
  customizable: boolean
}

export function DivisionCountSection({
  visible, divisionCount, setDivisionCount, loading, isEdit, options, customizable,
}: Props) {
  if (!visible) return null

  return (
    <div className="pt-[18px]">
      <StrategyFieldLabel hint="">분할 수</StrategyFieldLabel>
      <div className="flex gap-1 p-[3px] bg-muted rounded-[10px]">
        {options.map((value) => {
          const active = divisionCount === value
          const disabled = loading || isEdit || !customizable
          return (
            <SelectionCard
              key={value}
              selected={active}
              disabled={disabled}
              onClick={() => !disabled && setDivisionCount(value)}
              className="flex-1 rounded-[7px] px-3 py-2.5 text-center"
            >
              <div className={active ? 'text-sm font-bold' : 'text-sm font-bold text-muted-foreground'}>
                {value}분할
              </div>
            </SelectionCard>
          )
        })}
      </div>
      {isEdit && <p className="text-sm text-muted-foreground mt-1.5 px-1">분할 수는 등록 후 변경할 수 없습니다.</p>}
    </div>
  )
}
