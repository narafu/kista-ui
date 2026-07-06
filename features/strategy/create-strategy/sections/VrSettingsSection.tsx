'use client'

import { StrategyFieldLabel } from '../StrategyFieldLabel'
import type { VrFields } from '../model/useStrategyForm'

interface Props {
  fields: VrFields
  setField: (field: keyof VrFields, value: number | null) => void
  loading: boolean
  isEdit: boolean
}

function parseNumber(value: string): number | null {
  if (value.trim() === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function VrSettingsSection({ fields, setField, loading, isEdit }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel>밸류 리밸런싱 설정</StrategyFieldLabel>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">초기 V값</span>
          <div className="flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="number"
              min={0}
              step="0.01"
              value={fields.initialValue ?? ''}
              onChange={(event) => setField('initialValue', parseNumber(event.target.value))}
              disabled={loading || isEdit}
              className="flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none disabled:text-muted-foreground"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">USD</span>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">적립금(+)/인출금(-)</span>
          <div className="flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="number"
              step={1}
              value={fields.recurringAmount ?? ''}
              onChange={(event) => setField('recurringAmount', parseNumber(event.target.value))}
              disabled={loading || isEdit}
              className="flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none disabled:text-muted-foreground"
              placeholder="0"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">USD</span>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">밴드 폭</span>
          <div className="flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="number"
              min={0}
              step="0.01"
              value={fields.bandWidth ?? ''}
              onChange={(event) => setField('bandWidth', parseNumber(event.target.value))}
              disabled={loading || isEdit}
              className="flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none disabled:text-muted-foreground"
              placeholder="15.00"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">%</span>
          </div>
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">리밸런싱 주기</span>
          <div className="flex items-center h-11 rounded-[var(--r-sm)] border border-border bg-card px-3">
            <input
              type="number"
              min={1}
              step={1}
              value={fields.intervalWeeks ?? ''}
              onChange={(event) => setField('intervalWeeks', parseNumber(event.target.value))}
              disabled={loading || isEdit}
              className="flex-1 border-0 bg-transparent text-right text-sm font-semibold outline-none disabled:text-muted-foreground"
              placeholder="2"
            />
            <span className="ml-2 text-xs font-semibold text-muted-foreground">주</span>
          </div>
        </label>
      </div>

      {isEdit && (
        <p className="text-sm text-muted-foreground mt-2 px-1">
          VR 상세 설정은 등록 후 변경할 수 없습니다.
        </p>
      )}
    </div>
  )
}
