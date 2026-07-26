'use client'

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, Plus, RotateCcw, Save, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@entities/admin-settings'
import { useMeta } from '@entities/meta'
import type { BrokerCode } from '@shared/lib/api-schema'
import {
  DEFAULT_RUNTIME_BENCHMARKS,
  runtimeConfigKeys,
  type RecurringMode,
  type RuntimeBenchmarkFieldSettings,
  type RuntimeConfig,
  type RuntimeFieldSettings,
  type RuntimeStrategyType,
} from '@entities/runtime-config'
import { validateAdminSettings } from '../model/validateAdminSettings'

const STRATEGY_LABELS: Record<RuntimeStrategyType, string> = {
  INFINITE: 'INFINITE', PRIVACY: 'PRIVACY', VR: 'VR',
}

function clone(value: RuntimeConfig): RuntimeConfig {
  const next = structuredClone(value)
  next.benchmarks ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS)
  next.benchmarks.etf ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS.etf)
  return next
}

function ToggleRow({ id, label, description, checked, onChange }: {
  id: string; label: string; description?: string; checked: boolean; onChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-5 py-3">
      <div>
        <label htmlFor={id} className="text-sm font-semibold">{label}</label>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  )
}

type ValueSet<T extends string | number> = {
  allowedValues: T[]
  defaultValue: T
}

function normalizeSymbol(value: string) {
  return value.trim().toUpperCase()
}

function normalizeText(value: string) {
  return value.trim()
}

function normalizeNumber(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function ValueListEditor<T extends string | number>({ id, label, field, error, inputType = 'text', suggestions, normalize, onChange }: {
  id: string
  label: string
  field: ValueSet<T>
  error?: string
  inputType?: 'text' | 'number'
  suggestions?: string[]
  normalize: (value: string) => T | null
  onChange: (field: ValueSet<T>) => void
}) {
  const [raw, setRaw] = useState('')
  const [inputError, setInputError] = useState<string>()
  const datalistId = suggestions && suggestions.length > 0 ? `${id}-suggestions` : undefined

  const setDefault = (value: T) => {
    setInputError(undefined)
    onChange({ ...field, defaultValue: value })
  }

  const addValue = () => {
    const trimmed = raw.trim()
    if (trimmed === '') {
      setInputError('값을 입력하세요.')
      return
    }
    const parsed = normalize(raw)
    if (parsed === null) {
      setInputError(inputType === 'number' ? '올바른 숫자를 입력하세요.' : '값을 입력하세요.')
      return
    }
    if (field.allowedValues.includes(parsed)) {
      setInputError('이미 추가된 값입니다.')
      return
    }
    setInputError(undefined)
    setRaw('')
    onChange({ ...field, allowedValues: [...field.allowedValues, parsed] })
  }

  const deleteValue = (value: T) => {
    if (Object.is(value, field.defaultValue)) {
      setInputError('기본값은 삭제할 수 없습니다.')
      return
    }
    if (field.allowedValues.length <= 1) {
      setInputError('허용값은 하나 이상 필요합니다.')
      return
    }
    setInputError(undefined)
    onChange({ ...field, allowedValues: field.allowedValues.filter((item) => !Object.is(item, value)) })
  }

  return (
    <div className="space-y-2">
      <div role="radiogroup" aria-label={`${label} 기본값`} className="space-y-1.5">
        {field.allowedValues.map((value) => (
          <div key={String(value)} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-background px-2">
            <input
              type="radio"
              name={`${id}-default`}
              checked={Object.is(value, field.defaultValue)}
              onChange={() => setDefault(value)}
              aria-label={`${String(value)} 기본값`}
              className="size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0 flex-1 truncate font-mono text-sm">{String(value)}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-11 text-muted-foreground hover:text-foreground"
              aria-label={`${String(value)} 삭제`}
              onClick={() => deleteValue(value)}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          id={`${id}-add`}
          value={raw}
          type="text"
          list={datalistId}
          inputMode={inputType === 'number' ? 'decimal' : undefined}
          maxLength={100}
          aria-label={`${label} 추가`}
          aria-invalid={Boolean(inputError || error)}
          onChange={(event) => {
            setRaw(event.target.value)
            setInputError(undefined)
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              addValue()
            }
          }}
        />
        <Button type="button" variant="outline" size="icon" className="size-11" aria-label={`${label} 추가 확정`} onClick={addValue}>
          <Plus />
        </Button>
      </div>
      {datalistId && (
        <datalist id={datalistId}>
          {suggestions?.map((suggestion) => <option key={suggestion} value={suggestion} />)}
        </datalist>
      )}
      {(inputError || error) && <p role="alert" className="text-xs text-destructive">{inputError || error}</p>}
    </div>
  )
}

const RECURRING_MODE_OPTIONS = [
  { value: 'DEPOSIT', label: '입금' },
  { value: 'HOLD', label: '거치' },
  { value: 'WITHDRAW', label: '인출' },
] as const satisfies readonly { value: RecurringMode; label: string }[]

function RecurringModeEditor({ id, label, field, error, onChange }: {
  id: string
  label: string
  field: RuntimeFieldSettings<RecurringMode>
  error?: string
  onChange: (field: RuntimeFieldSettings<RecurringMode>) => void
}) {
  const [inputError, setInputError] = useState<string>()
  const setCustomizable = (customizable: boolean) => {
    setInputError(undefined)
    onChange(customizable ? { ...field, customizable: true } : { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' })
  }
  const toggleAllowed = (value: RecurringMode, checked: boolean) => {
    if (!checked && value === field.defaultValue) {
      setInputError('기본값은 해제할 수 없습니다.')
      return
    }
    const allowedValues = checked
      ? [...field.allowedValues, value]
      : field.allowedValues.filter((item) => item !== value)
    setInputError(undefined)
    onChange({ ...field, allowedValues })
  }

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
      <div className="flex min-h-8 items-center justify-between gap-3 sm:pr-4">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">사용자 변경</span>
          <Switch
            checked={field.customizable}
            onCheckedChange={setCustomizable}
            aria-label={`${label} 사용자 변경 허용`}
            size="sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        {field.customizable ? (
          <div className="space-y-1.5">
            {RECURRING_MODE_OPTIONS.map((option) => {
              const checked = field.allowedValues.includes(option.value)
              return (
                <div key={option.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => toggleAllowed(option.value, event.target.checked)}
                    aria-label={`${option.value} 허용`}
                    className="size-4 shrink-0 accent-primary"
                  />
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">
                    {option.value} <span className="font-sans text-xs text-muted-foreground">· {option.label}</span>
                  </span>
                  <input
                    type="radio"
                    name={`${id}-default`}
                    checked={field.defaultValue === option.value}
                    disabled={!checked}
                    onChange={() => {
                      setInputError(undefined)
                      onChange({ ...field, defaultValue: option.value })
                    }}
                    aria-label={`${option.value} 기본값`}
                    className="size-4 shrink-0 accent-primary disabled:opacity-40"
                  />
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
            HOLD <span className="ml-auto text-xs font-sans">고정</span>
          </div>
        )}
        {(inputError || error) && <p role="alert" className="text-xs text-destructive">{inputError || error}</p>}
      </div>
    </div>
  )
}

function FieldEditor<T extends string | number>({ id, label, field, error, fixed, suggestions, inputType = 'text', normalize, onChange }: {
  id: string
  label: string
  field: RuntimeFieldSettings<T>
  error?: string
  fixed?: boolean
  suggestions?: string[]
  inputType?: 'text' | 'number'
  normalize?: (value: string) => T | null
  onChange: (field: RuntimeFieldSettings<T>) => void
}) {
  const normalizeValue = normalize ?? ((value: string) => normalizeText(value) as T)

  if (fixed) {
    return (
      <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-center">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
          {String(field.defaultValue)} <span className="ml-auto text-xs font-sans">고정</span>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
      <div className="flex min-h-8 items-center justify-between gap-3 sm:pr-4">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">사용자 변경</span>
          <Switch
            checked={field.customizable}
            onCheckedChange={(customizable) => onChange(customizable
              ? { ...field, customizable: true }
              : { ...field, customizable: false, allowedValues: [field.defaultValue] })}
            aria-label={`${label} 사용자 변경 허용`}
            size="sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        {field.customizable ? (
          <ValueListEditor
            id={id}
            label={label}
            field={field}
            error={error}
            inputType={inputType}
            suggestions={suggestions}
            normalize={normalizeValue}
            onChange={(value) => onChange({ ...field, ...value })}
          />
        ) : (
          <div className="flex h-8 items-center rounded-lg border border-border bg-muted/40 px-2.5 font-mono text-sm text-muted-foreground">
            {String(field.defaultValue)} <span className="ml-auto text-xs font-sans">고정</span>
          </div>
        )}
        {!field.customizable && error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

export function AdminSettingsForm() {
  const { data } = useAdminSettingsQuery()

  if (!data) return null

  return <AdminSettingsFormContent settings={data} />
}

function AdminSettingsFormContent({ settings }: { settings: RuntimeConfig }) {
  const { meta, labelOf } = useMeta()
  const mutation = useUpdateAdminSettingsMutation()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => clone(settings))
  const [serverSnapshot, setServerSnapshot] = useState(() => clone(settings))
  const latestServerRef = useRef<RuntimeConfig | null>(null)
  if (latestServerRef.current === null) latestServerRef.current = clone(settings)
  const draftRef = useRef(draft)
  const [attempted, setAttempted] = useState(false)
  const tickerSuggestions = useMemo(() => meta.tickers.map((ticker) => ticker.code), [meta.tickers])

  // "최신값 ref" 패턴 — 렌더 중 직접 대입하면 React Doctor가 "렌더 중 ref 변경"으로 표시하므로
  // 커밋 이후 effect에서 갱신한다. 아래 [data] effect보다 먼저 선언돼 있어 같은 커밋에서
  // draft와 data가 함께 바뀌어도 이 effect가 먼저 실행되어 최신 draftRef를 보장한다.
  useEffect(() => {
    draftRef.current = draft
  })

  useEffect(() => {
    const wasPristine = JSON.stringify(draftRef.current) === JSON.stringify(latestServerRef.current)
    latestServerRef.current = clone(settings)
    setServerSnapshot(clone(settings))
    if (wasPristine) setDraft(clone(settings))
  }, [settings])

  const errors = useMemo(() => validateAdminSettings(draft), [draft])
  const dirty = JSON.stringify(draft) !== JSON.stringify(serverSnapshot)
  const setStrategyField = <T extends string | number>(strategy: RuntimeStrategyType, field: string, value: RuntimeFieldSettings<T>) => {
    setDraft((current) => ({
      ...current,
      strategies: {
        ...current.strategies,
        [strategy]: {
          ...current.strategies[strategy],
          fields: { ...current.strategies[strategy].fields, [field]: value },
        },
      },
    }))
  }
  const setStrategyEnabled = (strategy: RuntimeStrategyType, enabled: boolean) => setDraft((current) => {
    return {
      ...current,
      strategies: {
        ...current.strategies,
        [strategy]: { ...current.strategies[strategy], enabled },
      },
    }
  })
  const setBenchmarkEtf = (value: RuntimeBenchmarkFieldSettings<string>) => {
    setDraft((current) => ({
      ...current,
      benchmarks: { ...(current.benchmarks ?? DEFAULT_RUNTIME_BENCHMARKS), etf: value },
    }))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(errors).length > 0 || mutation.isPending) return
    mutation.mutate(draft, {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: runtimeConfigKeys.all, refetchType: 'all' })
        toast.success('운영 설정을 저장했습니다.')
        setAttempted(false)
      },
    })
  }
  const reset = () => {
    setDraft(clone(latestServerRef.current!))
    setServerSnapshot(clone(latestServerRef.current!))
    setAttempted(false)
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">가입 승인</h2>
          <ToggleRow
            id="approval-required"
            label="관리자 승인 필요"
            description="끄면 현재 승인 대기 사용자도 즉시 활성화됩니다."
            checked={draft.auth.approvalRequired}
            onChange={(approvalRequired) => setDraft((current) => ({ ...current, auth: { approvalRequired } }))}
          />
          {serverSnapshot.auth.approvalRequired && !draft.auth.approvalRequired && (
            <div className="flex gap-2 rounded-md border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-xs text-[var(--warn)]">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" /> 저장 즉시 가입 승인 대기 상태가 해제됩니다.
            </div>
          )}
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">증권사 등록</h2>
          {(Object.keys(draft.brokers) as BrokerCode[]).map((broker) => (
            <ToggleRow key={broker} id={`broker-${broker}`} label={labelOf('brokers', broker)} checked={draft.brokers[broker].enabled}
              onChange={(enabled) => setDraft((current) => ({ ...current, brokers: { ...current.brokers, [broker]: { enabled } } }))} />
          ))}
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">전략 생성</h2>
          {(Object.keys(STRATEGY_LABELS) as RuntimeStrategyType[]).map((strategy) => (
            <ToggleRow key={strategy} id={`strategy-${strategy}`} label={STRATEGY_LABELS[strategy]}
              checked={draft.strategies[strategy].enabled} onChange={(enabled) => setStrategyEnabled(strategy, enabled)} />
          ))}
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">벤치마크 비교</h2>
          <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
            <div className="flex min-h-8 items-center sm:pr-4">
              <span className="text-sm font-medium">ETF 벤치마크 자산</span>
            </div>
            <ValueListEditor
              id="benchmark-etf"
              label="ETF 벤치마크 자산"
              field={draft.benchmarks?.etf ?? DEFAULT_RUNTIME_BENCHMARKS.etf}
              error={attempted ? errors['benchmarks.etf'] : undefined}
              suggestions={DEFAULT_RUNTIME_BENCHMARKS.etf.allowedValues}
              normalize={normalizeSymbol}
              onChange={(value) => setBenchmarkEtf(value as RuntimeBenchmarkFieldSettings<string>)}
            />
          </div>
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">INFINITE 필드</h2>
          <FieldEditor
            id="infinite-ticker"
            label="종목"
            field={draft.strategies.INFINITE.fields.ticker}
            error={attempted ? errors['INFINITE.ticker'] : undefined}
            suggestions={tickerSuggestions}
            normalize={normalizeSymbol}
            onChange={(value) => setStrategyField('INFINITE', 'ticker', value)}
          />
          <FieldEditor
            id="infinite-division"
            label="분할 수"
            field={draft.strategies.INFINITE.fields.divisionCount!}
            error={attempted ? errors['INFINITE.divisionCount'] : undefined}
            inputType="number"
            normalize={normalizeNumber}
            onChange={(value) => setStrategyField('INFINITE', 'divisionCount', value)}
          />
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">PRIVACY 필드</h2>
          <FieldEditor id="privacy-ticker" label="종목" fixed field={draft.strategies.PRIVACY.fields.ticker}
            onChange={(value) => setStrategyField('PRIVACY', 'ticker', value)} />
        </section>

        <section className="px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">VR 필드</h2>
          <FieldEditor id="vr-ticker" label="종목" fixed field={draft.strategies.VR.fields.ticker}
            onChange={(value) => setStrategyField('VR', 'ticker', value)} />
          <RecurringModeEditor
            id="vr-recurring"
            label="정기 입출금 방식"
            field={draft.strategies.VR.fields.recurringMode!}
            error={attempted ? errors['VR.recurringMode'] : undefined}
            onChange={(value) => setStrategyField('VR', 'recurringMode', value)}
          />
          <FieldEditor id="vr-band" label="밴드 폭 (%)" field={draft.strategies.VR.fields.bandWidth!}
            error={attempted ? errors['VR.bandWidth'] : undefined} inputType="number" normalize={normalizeNumber} onChange={(value) => setStrategyField('VR', 'bandWidth', value)} />
          <FieldEditor id="vr-interval" label="주기 (주)" field={draft.strategies.VR.fields.intervalWeeks!}
            error={attempted ? errors['VR.intervalWeeks'] : undefined} inputType="number" normalize={normalizeNumber} onChange={(value) => setStrategyField('VR', 'intervalWeeks', value)} />
        </section>
      </div>

      <div className="sticky bottom-3 flex justify-end gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        <Button type="button" variant="outline" onClick={reset} disabled={!dirty || mutation.isPending}>
          <RotateCcw /> 변경 취소
        </Button>
        <Button type="submit" disabled={!dirty || mutation.isPending}>
          <Save /> {mutation.isPending ? '저장 중...' : '변경 저장'}
        </Button>
      </div>
    </form>
  )
}
