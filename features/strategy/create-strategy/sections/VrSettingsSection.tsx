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
      <StrategyFieldLabel hint="VR 전략 전용">밸류 리밸런싱 설정</StrategyFieldLabel>

      {!isEdit && (
        <p className="text-sm text-muted-foreground mb-4">
          초기 V는 보유 중인 TQQQ 평가금, 초기 pool은 현재 USD 예수금입니다. 적립식은 둘 다 0이어도 등록할 수 있습니다.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">초기 V값</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={fields.initialValue ?? ''}
            onChange={(event) => setField('initialValue', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="3000.00"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">리밸런싱 주기(주)</span>
          <input
            type="number"
            min={1}
            step={1}
            value={fields.intervalWeeks ?? ''}
            onChange={(event) => setField('intervalWeeks', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="4"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">밴드 폭(%)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            value={fields.bandWidth ?? ''}
            onChange={(event) => setField('bandWidth', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="15.00"
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-bold text-muted-foreground">주기당 입출금</span>
          <input
            type="number"
            step={1}
            value={fields.recurringAmount ?? ''}
            onChange={(event) => setField('recurringAmount', parseNumber(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">양수=향후 입금 · 0=거치 · 음수=향후 인출</p>
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
