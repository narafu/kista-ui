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

function parseInteger(value: string): number | null {
  const n = parseNumber(value)
  return n === null ? null : Math.trunc(n)
}

export function VrSettingsSection({ fields, setField, loading, isEdit }: Props) {
  return (
    <div className="py-[18px] border-b border-border">
      <StrategyFieldLabel hint="VR 전략 전용">밸류 리밸런싱 설정</StrategyFieldLabel>

      {!isEdit && (
        <p className="text-sm text-muted-foreground mb-4">
          TQQQ 보유가 없어도 등록 가능 — 초기 V값 기준으로 자동 분할 매수가 진행됩니다
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
            onChange={(event) => setField('intervalWeeks', parseInteger(event.target.value))}
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
          <span className="text-sm font-bold text-muted-foreground">주기당 추가 예수금</span>
          <input
            type="number"
            step={1}
            value={fields.recurringAmount ?? ''}
            onChange={(event) => setField('recurringAmount', parseInteger(event.target.value))}
            disabled={loading || isEdit}
            className="w-full h-11 rounded-[var(--r-sm)] border border-border bg-card px-3 text-sm font-semibold outline-none focus:border-rose-400 disabled:bg-muted disabled:text-muted-foreground"
            placeholder="0"
          />
          <p className="text-xs text-muted-foreground">양수=적립식 · 0=거치식 · 음수=인출식 (모드가 매수 한도를 결정)</p>
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
