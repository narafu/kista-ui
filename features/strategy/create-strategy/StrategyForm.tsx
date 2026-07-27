'use client'

import { cn } from '@shared/lib/utils'
import { Spinner } from '@shared/ui/Spinner'
import { Button } from '@/components/ui/button'
import { useMeta } from '@entities/meta'
import { useStrategyForm } from './model/useStrategyForm'
import { StrategyTypeSection } from './sections/StrategyTypeSection'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { UsageRatioSection } from './sections/UsageRatioSection'
import { ReadOnlySeedSection } from './sections/ReadOnlySeedSection'
import { CycleSeedSection } from './sections/CycleSeedSection'
import { DivisionCountSection } from './sections/DivisionCountSection'
import { VrSettingsSection } from './sections/VrSettingsSection'
import { InitialHoldingsSection } from './sections/InitialHoldingsSection'
import { ScheduledStartSection } from './sections/ScheduledStartSection'
import { StrategyFormSkeleton } from './StrategyFormSkeleton'
import type { Strategy } from '@entities/strategy'
import type { BrokerCode } from '@entities/account'

interface Props {
  accountId: string
  broker?: BrokerCode
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrategyForm({ accountId, broker, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const form = useStrategyForm({ accountId, broker, initial, onSuccess })
  const strategyTypes = initial
    ? meta.strategyTypes
    : meta.strategyTypes.filter(({ code }) => form.enabledStrategyTypes.includes(code))

  if (form.initializing) {
    return <StrategyFormSkeleton hasCancel={!!onCancel} />
  }

  if (!initial && form.runtimeConfigError) {
    return (
      <div className="rounded-[var(--r-sm)] border border-border bg-muted px-4 py-4 text-sm text-muted-foreground">
        <p>전략 설정을 불러오지 못했습니다.</p>
        <Button type="button" variant="outline" onClick={form.retryRuntimeConfig} className="mt-3 h-9">
          다시 시도
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={form.handleSubmit}>
      <StrategyTypeSection
        initial={initial}
        type={form.type}
        setType={form.setType}
        loading={form.loading}
        strategyTypes={strategyTypes}
      />

      <DivisionCountSection
        visible={form.usesDivisionCount}
        divisionCount={form.divisionCount}
        setDivisionCount={form.setDivisionCount}
        loading={form.loading}
        isEdit={!!initial}
        options={form.divisionCountSettings?.allowedValues ?? (initial?.divisionCount ? [initial.divisionCount] : [])}
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
        />
      )}

      {!initial && (
        <ScheduledStartSection
          value={form.scheduledStartDate}
          onChange={form.setScheduledStartDate}
          loading={form.loading}
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
          settings={form.vrSettings}
        />
      )}

      {initial && !form.canEditSeed ? (
        <ReadOnlySeedSection initialUsdDeposit={initial.initialUsdDeposit} />
      ) : (
        <UsageRatioSection
          hint={form.isVr ? undefined : initial ? '첫 매매 전이라 시드 수정이 가능합니다' : undefined}
          pct={form.pct}
          setPct={form.setPct}
          seedUsdInput={form.seedUsdInput}
          setSeedUsdInput={form.setSeedUsdInput}
          usdDeposit={form.usdDeposit}
          minSeed={form.minSeed}
          loading={form.loading}
          loadingBase={form.loadingBase}
          isBelowMinSeed={form.isBelowMinSeed}
          seedUnavailableReason={form.seedUnavailableReason}
          balanceCheckEnabled={form.balanceCheckEnabled}
          offBadgeLabel={form.isMock ? '모의계좌' : undefined}
        />
      )}

      {!form.isVr && (
        <CycleSeedSection
          autoStart={form.autoStart}
          setAutoStart={form.setAutoStart}
          seedMode={form.seedMode}
          setSeedMode={form.setSeedMode}
          loading={form.loading}
        />
      )}

      {form.cannotSubmit && form.submitDisabledReason && (
        <p className="text-sm font-semibold text-[var(--warn)] py-3">
          {form.submitDisabledReason}
        </p>
      )}

      <div className="flex gap-2.5 py-6">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={form.loading}
            className="flex-1 h-[46px] rounded-lg text-sm font-bold"
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          disabled={form.loading || form.cannotSubmit}
          className={cn('h-[46px] rounded-lg text-sm font-[800] gap-2', onCancel ? 'flex-[1.5]' : 'flex-1')}
        >
          {form.loading ? (
            <>
              <Spinner size={14} />
              저장 중...
            </>
          ) : (initial ? '수정' : '등록')}
        </Button>
      </div>
    </form>
  )
}
