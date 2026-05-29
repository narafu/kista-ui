'use client'

import { Button } from '@/components/ui/button'
import { useMeta } from '@/components/providers/MetaProvider'
import { useStrategyForm } from './hooks/useStrategyForm'
import { StrategyTypeSection } from './sections/StrategyTypeSection'
import { StrategyTickerSection } from './sections/StrategyTickerSection'
import { UsageRatioSection } from './sections/UsageRatioSection'
import { CycleSeedSection } from './sections/CycleSeedSection'
import type { Strategy } from '@/types/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  onSuccess?: () => void
  onCancel?: () => void
}

export function StrategyForm({ accountId, initial, onSuccess, onCancel }: Props) {
  const { meta } = useMeta()
  const form = useStrategyForm({ accountId, initial, onSuccess })

  return (
    <form onSubmit={form.handleSubmit}>
      <StrategyTypeSection
        initial={initial}
        type={form.type}
        setType={form.setType}
        loading={form.loading}
        strategyTypes={meta.strategyTypes}
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

      {!initial && (
        <UsageRatioSection
          pct={form.pct}
          setPct={form.setPct}
          usdDeposit={form.usdDeposit}
          minSeed={form.minSeed}
          loading={form.loading}
          loadingBase={form.loadingBase}
          isBelowMinSeed={form.isBelowMinSeed}
          isInfinite={form.isInfinite}
          privacyBase={form.privacyBase}
          basePrice={form.basePrice}
        />
      )}

      <CycleSeedSection
        autoStart={form.autoStart}
        setAutoStart={form.setAutoStart}
        seedMode={form.seedMode}
        setSeedMode={form.setSeedMode}
        loading={form.loading}
      />

      <div style={{ display: 'flex', gap: 10, paddingTop: 24, paddingBottom: 24 }}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={form.loading}
            style={{ flex: 1, height: 46, borderRadius: '8px', fontSize: 14, fontWeight: 700 }}
          >
            취소
          </Button>
        )}
        <Button
          type="submit"
          disabled={form.loading || form.cannotSubmit}
          style={{
            flex: onCancel ? 1.5 : 1,
            height: 46, borderRadius: '8px', fontSize: 14, fontWeight: 800,
          }}
        >
          {form.loading ? '저장 중...' : initial ? '수정' : '등록'}
        </Button>
      </div>
    </form>
  )
}
