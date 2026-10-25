'use client'

import { type FormEvent, type ReactNode, useMemo, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { AlertTriangle, ChevronDown, RotateCcw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { cn } from '@shared/lib/utils'
import { SectionError } from '@shared/ui/SectionError'
import { useAdminSettingsQuery, useUpdateAdminSettingsMutation } from '@entities/admin-settings'
import { adminKeys } from '@entities/admin'
import { useMeta } from '@entities/meta'
import { isMockBroker, type BrokerCode } from '@shared/lib/api-schema'
import {
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
import { RecurringModeEditor } from './RecurringModeEditor'
import { FieldEditor } from './FieldEditor'
import { normalizeNumber, normalizeSymbol } from '../model/normalizers'

// kista-api StrategyTicker의 DCA 전용 종목. 메타 availableTickers는 지금 편집 중인 허용값 자체라 후보 목록으로 쓸 수 없다
const DCA_TICKER_SUGGESTIONS = ['UPRO', 'QLD', 'BTC', 'ETH']

const hasStrategyError = (errors: Record<string, string>, strategy: RuntimeStrategyType) =>
  Object.keys(errors).some((key) => key.startsWith(`${strategy}.`))

// 전략 토글 아래에 그 전략의 생성 설정을 붙인다. 꺼진 전략은 요약 한 줄로 접되, 켜기 전에 미리 맞출 수 있게 펼칠 수 있다.
// 저장 시도 후 오류가 있으면 접힌 상태라도 펼친다 — 보이지 않는 오류로 저장만 막히지 않게
function StrategyBlock({ strategy, label, enabled, onToggle, summary, hasError, children }: {
  strategy: RuntimeStrategyType
  label: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  summary: string
  hasError: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const expanded = enabled || open || hasError
  const panelId = `strategy-${strategy}-fields`

  return (
    <div>
      {/* 토글할 때마다 수동 펼침을 되돌린다 — 다시 끄면 접힌 상태로 돌아가게 */}
      <ToggleRow id={`strategy-${strategy}`} label={label} checked={enabled} onChange={(next) => { setOpen(false); onToggle(next) }} />
      {!enabled && (
        <div className="-mt-1 flex items-center justify-between gap-3 pb-3">
          <p className="min-w-0 truncate text-xs text-muted-foreground">{summary}</p>
          {!hasError && (
            <Button type="button" variant="ghost" size="sm" aria-expanded={expanded} aria-controls={expanded ? panelId : undefined} onClick={() => setOpen((v) => !v)}>
              {expanded ? '설정 접기' : '설정 펼치기'} <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
            </Button>
          )}
        </div>
      )}
      {expanded && (
        <div id={panelId} className="mb-3 rounded-md border border-border bg-muted/30 px-3 sm:px-4">
          {children}
        </div>
      )}
    </div>
  )
}

function clone(value: RuntimeConfig): RuntimeConfig {
  const next = structuredClone(value)
  next.benchmarks ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS)
  next.benchmarks.etf ??= structuredClone(DEFAULT_RUNTIME_BENCHMARKS.etf)
  return next
}

export function AdminSettingsForm() {
  const { data, isError } = useAdminSettingsQuery()

  if (!data) return isError ? <SectionError message="운영 설정을 불러오지 못했습니다." /> : <LoadingRow />

  return <AdminSettingsFormContent settings={data} />
}

function AdminSettingsFormContent({ settings }: { settings: RuntimeConfig }) {
  const { meta, labelOf } = useMeta()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState(() => clone(settings))
  const serverSnapshot = useMemo(() => clone(settings), [settings])
  const [prevSettings, setPrevSettings] = useState(settings)
  // 서버값이 바뀌었을 때 초안이 이전 서버값과 같았다면(미편집) 새 서버값으로 따라간다 — 편집 중이면 초안을 보존
  if (settings !== prevSettings) {
    setPrevSettings(settings)
    if (JSON.stringify(draft) === JSON.stringify(clone(prevSettings))) setDraft(clone(settings))
  }
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

      // 저장은 이미 서버에 반영됐다 — 재조회 실패가 저장 실패 토스트로 이어지지 않게 삼키고 성공 토스트는 항상 띄운다
      await Promise.allSettled(invalidations)

      toast.success('운영 설정을 저장했습니다')
      setAttempted(false)
    },
  })
  const tickerSuggestions = useMemo(() => meta.tickers.map((ticker) => ticker.code), [meta.tickers])

  const errors = useMemo(() => validateAdminSettings(draft), [draft])
  // 배포 직후 낡은 응답엔 DCA 키가 없다 — 그대로 저장하면 kista-api가 400을 낸다
  const dca = draft.strategies.DCA
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
    if (Object.keys(errors).length > 0 || mutation.isPending || !dca) return
    activatesPendingUsersRef.current = serverSnapshot.auth.approvalRequired && !draft.auth.approvalRequired
    mutation.mutate(draft)
  }
  const reset = () => {
    setDraft(clone(settings))
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
            description="끄면 승인 대기 사용자도 즉시 활성화"
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
          <h2 className="text-base font-bold">증권사·거래소 등록</h2>
          {(Object.keys(draft.brokers) as BrokerCode[])
            .sort((a, b) => Number(isMockBroker(a)) - Number(isMockBroker(b)))
            .map((broker) => (
            <ToggleRow key={broker} id={`broker-${broker}`} label={labelOf('brokers', broker)} checked={draft.brokers[broker].enabled}
              onChange={(enabled) => setDraft((current) => ({ ...current, brokers: { ...current.brokers, [broker]: { enabled } } }))} />
          ))}
        </section>

        <section className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-base font-bold">전략 생성</h2>
          <div className="divide-y divide-border">
            <StrategyBlock
              strategy="INFINITE"
              label={labelOf('strategyTypes', 'INFINITE')}
              enabled={draft.strategies.INFINITE.enabled}
              onToggle={(enabled) => setStrategyEnabled('INFINITE', enabled)}
              summary={`종목 ${draft.strategies.INFINITE.fields.ticker.defaultValue} · 분할 ${draft.strategies.INFINITE.fields.divisionCount?.defaultValue ?? '-'}`}
              hasError={attempted && hasStrategyError(errors, 'INFINITE')}
            >
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
            </StrategyBlock>

            <StrategyBlock
              strategy="PRIVACY"
              label={labelOf('strategyTypes', 'PRIVACY')}
              enabled={draft.strategies.PRIVACY.enabled}
              onToggle={(enabled) => setStrategyEnabled('PRIVACY', enabled)}
              summary={`종목 ${draft.strategies.PRIVACY.fields.ticker.defaultValue}`}
              hasError={attempted && hasStrategyError(errors, 'PRIVACY')}
            >
              <FieldEditor id="privacy-ticker" label="종목" fixed field={draft.strategies.PRIVACY.fields.ticker}
                onChange={(value) => setStrategyField('PRIVACY', 'ticker', value)} />
            </StrategyBlock>

            <StrategyBlock
              strategy="VR"
              label={labelOf('strategyTypes', 'VR')}
              enabled={draft.strategies.VR.enabled}
              onToggle={(enabled) => setStrategyEnabled('VR', enabled)}
              summary={`종목 ${draft.strategies.VR.fields.ticker.defaultValue} · 밴드 ${draft.strategies.VR.fields.bandWidth?.defaultValue ?? '-'}% · ${draft.strategies.VR.fields.intervalWeeks?.defaultValue ?? '-'}주`}
              hasError={attempted && hasStrategyError(errors, 'VR')}
            >
              <FieldEditor id="vr-ticker" label="종목" fixed field={draft.strategies.VR.fields.ticker}
                onChange={(value) => setStrategyField('VR', 'ticker', value)} />
              <RecurringModeEditor
                label="정기 입출금 방식"
                field={draft.strategies.VR.fields.recurringMode!}
                error={attempted ? errors['VR.recurringMode'] : undefined}
                onChange={(value) => setStrategyField('VR', 'recurringMode', value)}
              />
              <FieldEditor id="vr-band" label="밴드 폭 (%)" field={draft.strategies.VR.fields.bandWidth!}
                error={attempted ? errors['VR.bandWidth'] : undefined} inputType="number" normalize={normalizeNumber} onChange={(value) => setStrategyField('VR', 'bandWidth', value)} />
              <FieldEditor id="vr-interval" label="주기 (주)" field={draft.strategies.VR.fields.intervalWeeks!}
                error={attempted ? errors['VR.intervalWeeks'] : undefined} inputType="number" normalize={normalizeNumber} onChange={(value) => setStrategyField('VR', 'intervalWeeks', value)} />
            </StrategyBlock>

            {dca ? (
              <StrategyBlock
                strategy="DCA"
                label={labelOf('strategyTypes', 'DCA')}
                enabled={dca.enabled}
                onToggle={(enabled) => setStrategyEnabled('DCA', enabled)}
                summary={`종목 ${dca.fields.ticker.defaultValue}`}
                hasError={attempted && hasStrategyError(errors, 'DCA')}
              >
                <FieldEditor
                  id="dca-ticker"
                  label="종목"
                  field={dca.fields.ticker}
                  error={attempted ? errors['DCA.ticker'] : undefined}
                  suggestions={DCA_TICKER_SUGGESTIONS}
                  normalize={normalizeSymbol}
                  onChange={(value) => setStrategyField('DCA', 'ticker', value)}
                />
              </StrategyBlock>
            ) : (
              <div className="py-3">
                <span className="text-sm font-medium">{labelOf('strategyTypes', 'DCA')}</span>
                <p className="mt-1 text-sm text-[var(--status-error)]">설정 정보가 오래되어 저장할 수 없습니다. 페이지를 새로고침해야 합니다.</p>
              </div>
            )}
          </div>
        </section>

        <section className="px-4 py-4 sm:px-5">
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
      </div>

      <div className="sticky bottom-3 flex justify-end gap-2 rounded-lg border border-border bg-background/95 p-3 shadow-sm backdrop-blur">
        {(!dca || !dirty) && (
          <p className="mr-auto self-center text-xs text-muted-foreground">
            {!dca ? 'DCA 설정이 없어 저장할 수 없습니다.' : '변경 사항이 없습니다.'}
          </p>
        )}
        <Button type="button" variant="outline" onClick={reset} disabled={!dirty || mutation.isPending}>
          <RotateCcw /> 변경 취소
        </Button>
        <Button type="submit" disabled={!dirty || mutation.isPending || !dca}>
          <Save /> {mutation.isPending ? '저장 중...' : '변경 저장'}
        </Button>
      </div>
    </form>
  )
}
