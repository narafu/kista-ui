'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@entities/admin-settings'
import {
  DEFAULT_RUNTIME_BENCHMARKS,
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

function FieldEditor<T extends string | number>({ id, label, field, error, fixed, onChange, onRawError }: {
  id: string
  label: string
  field: RuntimeFieldSettings<T>
  error?: string
  fixed?: boolean
  onChange: (field: RuntimeFieldSettings<T>) => void
  onRawError?: (error?: string) => void
}) {
  const isNumber = typeof field.defaultValue === 'number'
  const [rawValues, setRawValues] = useState(() => field.allowedValues.join(', '))

  useEffect(() => {
    const tokens = rawValues.split(',').map((value) => value.trim())
    const valid = !tokens.some((value) => value === '')
      && (!isNumber || !tokens.some((value) => !Number.isFinite(Number(value))))
    const parsed = valid ? (isNumber ? tokens.map(Number) : tokens) : null
    if (!parsed || JSON.stringify(parsed) !== JSON.stringify(field.allowedValues)) {
      setRawValues(field.allowedValues.join(', '))
    }
    // field.allowedValues is the synchronization boundary; rawValues intentionally remains locally formatted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.allowedValues])

  const parseRaw = (raw: string): T[] | null => {
    const tokens = raw.split(',').map((value) => value.trim())
    if (tokens.some((value) => value === '') || (isNumber && tokens.some((value) => !Number.isFinite(Number(value))))) {
      onRawError?.(isNumber ? '올바른 숫자를 쉼표로 구분해 입력하세요.' : '빈 허용값 없이 쉼표로 구분해 입력하세요.')
      return null
    }
    onRawError?.()
    return (isNumber ? tokens.map(Number) : tokens) as T[]
  }
  const updateRawValues = (raw: string) => {
    setRawValues(raw)
    const allowedValues = parseRaw(raw)
    if (allowedValues) onChange({ ...field, allowedValues })
  }

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
        <label htmlFor={`${id}-values`} className="text-sm font-medium">{label}</label>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">사용자 변경</span>
          <Switch
            checked={field.customizable}
            onCheckedChange={(customizable) => onChange(customizable
              ? { ...field, customizable }
              : { ...field, customizable, allowedValues: [field.defaultValue] })}
            aria-label={`${label} 사용자 변경 허용`}
            size="sm"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_minmax(88px,0.55fr)] gap-2">
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">허용값 (쉼표 구분)</span>
            <Input id={`${id}-values`} value={rawValues} onChange={(event) => updateRawValues(event.target.value)} aria-invalid={Boolean(error)} />
          </div>
          <div>
            <label htmlFor={`${id}-default`} className="mb-1 block text-xs text-muted-foreground">기본값</label>
            <Input
              id={`${id}-default`}
              type={isNumber ? 'number' : 'text'}
              value={String(field.defaultValue)}
              onChange={(event) => onChange({ ...field, defaultValue: (isNumber ? Number(event.target.value) : event.target.value) as T })}
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

function BenchmarkFieldEditor({ id, label, field, error, onChange, onRawError }: {
  id: string
  label: string
  field: RuntimeBenchmarkFieldSettings<string>
  error?: string
  onChange: (field: RuntimeBenchmarkFieldSettings<string>) => void
  onRawError?: (error?: string) => void
}) {
  const [rawValues, setRawValues] = useState(() => field.allowedValues.join(', '))

  useEffect(() => {
    const tokens = rawValues.split(',').map((value) => value.trim())
    const valid = !tokens.some((value) => value === '')
    if (!valid || JSON.stringify(tokens) !== JSON.stringify(field.allowedValues)) {
      setRawValues(field.allowedValues.join(', '))
    }
    // field.allowedValues is the synchronization boundary; rawValues intentionally remains locally formatted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [field.allowedValues])

  const parseRaw = (raw: string): string[] | null => {
    const tokens = raw.split(',').map((value) => value.trim().toUpperCase())
    if (tokens.some((value) => value === '')) {
      onRawError?.('빈 허용값 없이 쉼표로 구분해 입력하세요.')
      return null
    }
    onRawError?.()
    return tokens
  }
  const updateRawValues = (raw: string) => {
    setRawValues(raw)
    const allowedValues = parseRaw(raw)
    if (allowedValues) onChange({ ...field, allowedValues })
  }

  return (
    <div className="grid gap-2 py-3 sm:grid-cols-[minmax(140px,1fr)_minmax(220px,1.5fr)] sm:items-start">
      <div className="flex min-h-8 items-center sm:pr-4">
        <label htmlFor={`${id}-values`} className="text-sm font-medium">{label}</label>
      </div>
      <div className="space-y-2">
        <div className="grid grid-cols-[1fr_minmax(88px,0.55fr)] gap-2">
          <div>
            <span className="mb-1 block text-xs text-muted-foreground">자산 목록 (쉼표 구분)</span>
            <Input id={`${id}-values`} value={rawValues} onChange={(event) => updateRawValues(event.target.value)} aria-invalid={Boolean(error)} />
          </div>
          <div>
            <label htmlFor={`${id}-default`} className="mb-1 block text-xs text-muted-foreground">기본값</label>
            <Input
              id={`${id}-default`}
              value={field.defaultValue}
              onChange={(event) => onChange({ ...field, defaultValue: event.target.value.trim().toUpperCase() })}
              aria-invalid={Boolean(error)}
            />
          </div>
        </div>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  )
}

export function AdminSettingsForm({ initialSettings }: { initialSettings: RuntimeConfig }) {
  const { data } = useAdminSettingsQuery(initialSettings)
  const mutation = useUpdateAdminSettingsMutation()
  const [draft, setDraft] = useState(() => clone(initialSettings))
  const [serverSnapshot, setServerSnapshot] = useState(() => clone(initialSettings))
  const latestServerRef = useRef(clone(initialSettings))
  const draftRef = useRef(draft)
  const [attempted, setAttempted] = useState(false)
  const [rawErrors, setRawErrors] = useState<Record<string, string>>({})

  // "최신값 ref" 패턴 — 렌더 중 직접 대입하면 React Doctor가 "렌더 중 ref 변경"으로 표시하므로
  // 커밋 이후 effect에서 갱신한다. 아래 [data] effect보다 먼저 선언돼 있어 같은 커밋에서
  // draft와 data가 함께 바뀌어도 이 effect가 먼저 실행되어 최신 draftRef를 보장한다.
  useEffect(() => {
    draftRef.current = draft
  })

  useEffect(() => {
    if (!data) return
    const wasPristine = JSON.stringify(draftRef.current) === JSON.stringify(latestServerRef.current)
    latestServerRef.current = clone(data)
    setServerSnapshot(clone(data))
    if (wasPristine) setDraft(clone(data))
  }, [data])

  const errors = useMemo(() => ({ ...validateAdminSettings(draft), ...rawErrors }), [draft, rawErrors])
  const dirty = JSON.stringify(draft) !== JSON.stringify(serverSnapshot) || Object.keys(rawErrors).length > 0
  const setStrategyField = <T extends string | number>(strategy: RuntimeStrategyType, field: string, value: RuntimeFieldSettings<T>) => {
    setDraft((current) => {
      const next = clone(current)
      Object.assign(next.strategies[strategy].fields, { [field]: value })
      return next
    })
  }
  const setStrategyEnabled = (strategy: RuntimeStrategyType, enabled: boolean) => setDraft((current) => {
    const next = clone(current)
    next.strategies[strategy].enabled = enabled
    return next
  })
  const setBenchmarkEtf = (value: RuntimeBenchmarkFieldSettings<string>) => {
    setDraft((current) => {
      const next = clone(current)
      next.benchmarks = { ...(next.benchmarks ?? DEFAULT_RUNTIME_BENCHMARKS), etf: value }
      return next
    })
  }
  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(errors).length > 0 || mutation.isPending) return
    mutation.mutate(draft, { onSuccess: () => setAttempted(false) })
  }
  const reset = () => {
    setDraft(clone(latestServerRef.current))
    setServerSnapshot(clone(latestServerRef.current))
    setRawErrors({})
    setAttempted(false)
  }
  const setRawError = (key: string, error?: string) => setRawErrors((current) => {
    const next = { ...current }
    if (error) next[key] = error
    else delete next[key]
    return next
  })

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
          {(['KIS', 'TOSS'] as const).map((broker) => (
            <ToggleRow key={broker} id={`broker-${broker}`} label={broker} checked={draft.brokers[broker].enabled}
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
          <BenchmarkFieldEditor
            id="benchmark-etf"
            label="ETF 벤치마크 자산"
            field={draft.benchmarks?.etf ?? DEFAULT_RUNTIME_BENCHMARKS.etf}
            error={attempted ? errors['benchmarks.etf'] : undefined}
            onRawError={(error) => setRawError('benchmarks.etf', error)}
            onChange={setBenchmarkEtf}
          />
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">INFINITE 필드</h2>
          <FieldEditor id="infinite-ticker" label="종목" field={draft.strategies.INFINITE.fields.ticker}
            error={attempted ? errors['INFINITE.ticker'] : undefined} onRawError={(error) => setRawError('INFINITE.ticker', error)} onChange={(value) => setStrategyField('INFINITE', 'ticker', value)} />
          <FieldEditor id="infinite-division" label="분할 수" field={draft.strategies.INFINITE.fields.divisionCount!}
            error={attempted ? errors['INFINITE.divisionCount'] : undefined} onRawError={(error) => setRawError('INFINITE.divisionCount', error)} onChange={(value) => setStrategyField('INFINITE', 'divisionCount', value)} />
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
          <FieldEditor id="vr-recurring" label="정기 입출금 방식" field={draft.strategies.VR.fields.recurringMode!}
            error={attempted ? errors['VR.recurringMode'] : undefined} onRawError={(error) => setRawError('VR.recurringMode', error)} onChange={(value) => setStrategyField('VR', 'recurringMode', value)} />
          <FieldEditor id="vr-band" label="밴드 폭 (%)" field={draft.strategies.VR.fields.bandWidth!}
            error={attempted ? errors['VR.bandWidth'] : undefined} onRawError={(error) => setRawError('VR.bandWidth', error)} onChange={(value) => setStrategyField('VR', 'bandWidth', value)} />
          <FieldEditor id="vr-interval" label="주기 (주)" field={draft.strategies.VR.fields.intervalWeeks!}
            error={attempted ? errors['VR.intervalWeeks'] : undefined} onRawError={(error) => setRawError('VR.intervalWeeks', error)} onChange={(value) => setStrategyField('VR', 'intervalWeeks', value)} />
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
