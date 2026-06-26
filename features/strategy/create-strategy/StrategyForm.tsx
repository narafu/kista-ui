'use client'

import { cn } from '@shared/lib/utils'
import { Button } from '@/components/ui/button'
import { useMeta } from '@entities/meta'
import { useStrategyForm } from './model/useStrategyForm'
import { StrategyTypeSection } from './sections/StrategyTypeSection'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { UsageRatioSection } from './sections/UsageRatioSection'
import { CycleSeedSection } from './sections/CycleSeedSection'
import { DivisionCountSection } from './sections/DivisionCountSection'
import { StrategyFormSkeleton } from './StrategyFormSkeleton'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const { meta, findStrategyType } = useMeta()
  const form = useStrategyForm({ accountId, initial, onSuccess })

  if (form.initializing) {
    return <StrategyFormSkeleton hasCancel={!!onCancel} />
  }

  return (
    <form onSubmit={form.handleSubmit}>
      <StrategyTypeSection
        initial={initial}
        type={form.type}
        setType={form.setType}
        loading={form.loading}
        strategyTypes={meta.strategyTypes}
      />

      <DivisionCountSection
        visible={form.usesDivisionCount}
        options={findStrategyType(form.type)?.divisionCounts ?? []}
        divisionCount={form.divisionCount}
        setDivisionCount={form.setDivisionCount}
        loading={form.loading}
        isEdit={!!initial}
      />

      <StrategyTickerSection
        initial={initial}
        ticker={form.ticker}
        availableTickers={form.availableTickers}
        prices={form.prices}
        basePrice={form.basePrice}
        loading={form.loading}
        onTickerChange={form.handleTickerChange}
      />

      <UsageRatioSection
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
      />

      <CycleSeedSection
        autoStart={form.autoStart}
        setAutoStart={form.setAutoStart}
        seedMode={form.seedMode}
        setSeedMode={form.setSeedMode}
        loading={form.loading}
      />

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
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              저장 중...
            </>
          ) : (initial ? '수정' : '등록')}
        </Button>
      </div>
    </form>
  )
}
