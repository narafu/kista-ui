'use client'

import { type FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@entities/admin-settings'
import { adminKeys } from '@entities/admin'
import { useMeta } from '@entities/meta'
import type { BrokerCode } from '@shared/lib/api-schema'
import {
  DEFAULT_ASSET_FORM_OPTIONS,
  DEFAULT_RUNTIME_BENCHMARKS,
  runtimeConfigKeys,
  type RuntimeBenchmarkFieldSettings,
  type RuntimeConfig,
  type RuntimeFieldSettings,
  type RuntimeStrategyType,
} from '@entities/runtime-config'
import { validateAdminSettings } from '../model/validateAdminSettings'
import { ToggleRow } from './ToggleRow'
import { ValueListEditor } from './ValueListEditor'
import { SuggestionListEditor } from './SuggestionListEditor'
import { RecurringModeEditor } from './RecurringModeEditor'
import { FieldEditor } from './FieldEditor'
import { normalizeNumber, normalizeSymbol } from '../model/normalizers'

const STRATEGY_LABELS: Record<RuntimeStrategyType, string> = {
  INFINITE: 'INFINITE', PRIVACY: 'PRIVACY', VR: 'VR',
}

function clone(value: RuntimeConfig): RuntimeConfig {
  const next = structuredClone(value)
  next.benchmarks ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS)
  next.benchmarks.etf ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS.etf)
  // benchmarks와 동일하게 두 단계로 보충한다 — 객체 자체가 없을 때뿐 아니라 하위 필드만 없는 경우도 방어한다.
  // 한 단계만 보충하면 이후 렌더에서 .map()/.length 접근이 그대로 터진다.
  next.assetFormOptions ??= structuredClone(DEFAULT_ASSET_FORM_OPTIONS)
  next.assetFormOptions.strategySuggestions ??= structuredClone(DEFAULT_ASSET_FORM_OPTIONS.strategySuggestions)
  return next
}

export function AdminSettingsForm() {
  const { data } = useAdminSettingsQuery()

  if (!data) return null

  return <AdminSettingsFormContent settings={data} />
}

function AdminSettingsFormContent({ settings }: { settings: RuntimeConfig }) {
  const { meta, labelOf } = useMeta()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => clone(settings))
  const [serverSnapshot, setServerSnapshot] = useState(() => clone(settings))
  const latestServerRef = useRef<RuntimeConfig | null>(null)
  if (latestServerRef.current === null) latestServerRef.current = clone(settings)
  const draftRef = useRef(draft)
  const [attempted, setAttempted] = useState(false)
  const activatesPendingUsersRef = useRef(false)
  const mutation = useUpdateAdminSettingsMutation({
    onSuccess: async () => {
      const invalidations = [
        queryClient.invalidateQueries(
          { queryKey: runtimeConfigKeys.all, refetchType: 'all' },
          { throwOnError: true },
        ),
      ]
      if (activatesPendingUsersRef.current) {
        invalidations.push(
          queryClient.invalidateQueries(
            { queryKey: adminKeys.usersRoot(), refetchType: 'all' },
            { throwOnError: true },
          ),
          queryClient.invalidateQueries(
            { queryKey: adminKeys.stats(), refetchType: 'all' },
            { throwOnError: true },
          ),
        )
      }

      const results = await Promise.allSettled(invalidations)
      for (const result of results) {
        if (result.status === 'rejected') throw result.reason
      }

      toast.success('운영 설정을 저장했습니다.')
      setAttempted(false)
    },
  })
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
  const currentAssetFormOptions = draft.assetFormOptions ?? DEFAULT_ASSET_FORM_OPTIONS
  const setStrategySuggestions = (values: string[]) => {
    setDraft((current) => ({
      ...current,
      assetFormOptions: { ...(current.assetFormOptions ?? DEFAULT_ASSET_FORM_OPTIONS), strategySuggestions: values },
    }))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setAttempted(true)
    if (Object.keys(errors).length > 0 || mutation.isPending) return
    activatesPendingUsersRef.current = serverSnapshot.auth.approvalRequired && !draft.auth.approvalRequired
    mutation.mutate(draft)
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

        <section className="border-b border-border px-4 py-4 sm:px-5">
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

        <section className="px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">자산 등록 폼 추천 목록</h2>
          <p className="pb-2 text-xs text-muted-foreground">
            '자산' 메뉴 등록 폼의 운용전략은 자유 입력을 유지합니다 — 아래 목록은 입력을 돕는 추천값일 뿐 값 자체를 제한하지 않습니다.
          </p>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium">운용전략</span>
              <SuggestionListEditor
                id="asset-strategy"
                label="운용전략"
                values={currentAssetFormOptions.strategySuggestions}
                onChange={setStrategySuggestions}
              />
            </div>
          </div>
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
