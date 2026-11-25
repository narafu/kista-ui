'use client'

import type { SubmitReasonField } from './model/strategyFormGuards'
import { FormActions } from '@shared/ui/FormActions'
import { Button } from '@/components/ui/button'
import { useMeta } from '@entities/meta'
import { useStrategyForm } from './model/useStrategyForm'
import type { UseStrategyFormReturn } from './model/useStrategyForm'
import { StrategyTypeSection } from './sections/StrategyTypeSection'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { SeedInputSection } from './sections/SeedInputSection'
import { ReadOnlySeedSection } from './sections/ReadOnlySeedSection'
import { CycleSeedSection } from './sections/CycleSeedSection'
import { DivisionCountSection } from './sections/DivisionCountSection'
import { VrSettingsSection } from './sections/VrSettingsSection'
import { InitialHoldingsSection } from './sections/InitialHoldingsSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { DcaStrategyForm } from './DcaStrategyForm'
import { StrategyFormSkeleton } from './StrategyFormSkeleton'
import { StrategyValidationWarnings, type Strategy } from '@entities/strategy'
import type { BrokerCode } from '@entities/account'

interface Props {
  accountId: string
  broker?: BrokerCode
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

function divisionCountOptions(form: UseStrategyFormReturn, initial?: Strategy): number[] {
  return form.divisionCountSettings?.allowedValues ?? (initial?.divisionCount ? [initial.divisionCount] : [])
}

function seedHint(isVr: boolean, initial?: Strategy) {
  if (isVr || !initial) return undefined
  return '첫 매매 전이라 예수금 수정이 가능합니다'
}

function SeedSection({ form, initial }: { form: UseStrategyFormReturn; initial?: Strategy }) {
  if (initial && !form.canEditSeed) {
    return <ReadOnlySeedSection initialDeposit={initial.initialDeposit} />
  }
  return (
    <SeedInputSection
      hint={seedHint(form.isVr, initial)}
      seedUsdInput={form.seedUsdInput}
      setSeedUsdInput={form.setSeedUsdInput}
      availableCash={form.availableCash}
      minSeed={form.minSeed}
      isBelowMinSeed={form.isBelowMinSeed}
      loading={form.loading}
      mockBadgeLabel={form.isMock ? '모의계좌' : undefined}
    />
  )
}

export function StrategyForm({ accountId, broker, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const form = useStrategyForm({ accountId, broker, initial, onSuccess })
  const enabledTypeSet = new Set(form.enabledStrategyTypes)
  const strategyTypes = initial
    ? meta.strategyTypes
    : meta.strategyTypes.filter(({ code }) => enabledTypeSet.has(code))

  if (form.initializing) {
    return <StrategyFormSkeleton hasCancel={!!onCancel} />
  }

  // DCA는 시드·분할·VR과 무관한 별도 폼 — 유형 선택(등록)만 공유하고 나머지는 DcaStrategyForm이 렌더
  if ((initial?.type ?? form.type) === 'DCA') {
    return (
      <DcaStrategyForm
        key={initial?.id ?? 'new'}
        accountId={accountId}
        initial={initial}
        availableTickers={initial ? [initial.ticker] : form.availableTickers}
        defaultTicker={form.defaultTicker}
        isMock={form.isMock}
        onSuccess={onSuccess}
        onCancel={onCancel}
        header={!initial && (
          <StrategyTypeSection initial={initial} type={form.type} setType={form.setType} loading={form.loading} strategyTypes={strategyTypes} restrictionNotes={form.brokerRestrictionNotes} />
        )}
      />
    )
  }

  const fieldError = (f: SubmitReasonField) => (form.submitDisabledField === f ? form.submitDisabledReason ?? undefined : undefined)

  return (
    <form onSubmit={(e) => {
      const formEl = e.currentTarget
      // 막힌 제출은 사유로 포커스를 옮긴다 — 사유는 렌더 뒤에 생길 수 있어 다음 프레임에 찾는다
      if (!form.handleSubmit(e)) requestAnimationFrame(() => formEl.querySelector<HTMLElement>('[aria-invalid="true"], [data-submit-reason]')?.focus())
    }}>
      <StrategyTypeSection
        initial={initial}
        type={form.type}
        setType={form.setType}
        loading={form.loading}
        strategyTypes={strategyTypes}
        restrictionNotes={form.brokerRestrictionNotes}
      />

      <DivisionCountSection
        visible={form.usesDivisionCount}
        divisionCount={form.divisionCount}
        setDivisionCount={form.setDivisionCount}
        loading={form.loading}
        isEdit={!!initial}
        options={divisionCountOptions(form, initial)}
        customizable={form.divisionCountSettings?.customizable ?? false}
      />

      <StrategyTickerSection
        initial={initial}
        ticker={form.ticker}
        availableTickers={form.availableTickers}
        prices={form.prices}
        basePrice={form.basePrice}
        loading={form.loading}
        onTickerChange={form.handleTickerChange}
        customizable={form.tickerCustomizable}
      />

      {!initial && (
        <InitialHoldingsSection
          avgPrice={form.vrFields.avgPrice}
          quantity={form.vrFields.quantity}
          setField={form.setVrField}
          loading={form.loading}
          error={fieldError('holdings')}
        />
      )}

      {!initial && (
        <ScheduledStartSection
          value={form.scheduledStartDate}
          onChange={form.setScheduledStartDate}
          loading={form.loading}
          error={fieldError('scheduledStart')}
        />
      )}

      {form.isVr && (
        <VrSettingsSection
          fields={form.vrFields}
          setField={form.setVrField}
          recurringMode={form.recurringMode}
          setRecurringMode={form.setRecurringMode}
          loading={form.loading}
          isEdit={!!initial}
          initialVrValue={initial?.vr?.value ?? 0}
          vrRampDefaults={form.vrRampDefaults}
          settings={form.vrSettings}
          recurringError={fieldError('recurring')}
        />
      )}

      <SeedSection form={form} initial={initial} />

      {!form.isVr && (
        <CycleSeedSection
          autoStart={form.autoStart}
          setAutoStart={form.setAutoStart}
          seedMode={form.seedMode}
          setSeedMode={form.setSeedMode}
          loading={form.loading}
        />
      )}

      {form.submitDisabledReason && !form.submitDisabledField && (
        <div className="flex items-center gap-3 py-3">
          <p data-submit-reason tabIndex={-1} className="text-sm font-semibold text-warn">
            {form.submitDisabledReason}
          </p>
          {form.seedCheck === 'failed' && (
            <Button type="button" variant="outline" size="sm" onClick={form.retryValidation}>다시 시도</Button>
          )}
        </div>
      )}

      <StrategyValidationWarnings warnings={form.warnings} unavailable={form.validationUnavailable} />

      <FormActions
        onCancel={onCancel}
        isPending={form.loading}
        locked={form.runtimeConfigUnavailable}
        label={initial ? '수정' : '등록'}
        className="py-6"
      />
    </form>
  )
}
