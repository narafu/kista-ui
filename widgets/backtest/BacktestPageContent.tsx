'use client'

import { BacktestForm, useBacktestForm } from '@features/backtest/run-backtest'
import { fmtDate, fmtUsd } from '@shared/lib/format'
import { EquityLineChart } from '@shared/ui/EquityLineChart'
import { BacktestSummaryCards } from './BacktestSummaryCards'
import { BacktestWarnings } from './BacktestWarnings'

export function BacktestPageContent() {
  const form = useBacktestForm()
  const result = form.result

  return (
    <div className="flex flex-col gap-5">
      <BacktestForm form={form} />
      {result && (
        <div className="flex flex-col gap-5">
          <BacktestSummaryCards summary={result.summary} />
          <div className="rounded-[var(--r-lg)] border border-border bg-card p-4 sm:p-6">
            <EquityLineChart
              rows={result.points.map((p) => ({ date: p.date, asset: p.totalAsset, principal: p.principal }))}
              assetLabel="총자산"
              principalLabel="투입 원금"
              valueFormatter={(v) => `$${fmtUsd(v)}`}
              yAxisWidth={44}
              yAxisTickFormatter={(v) => fmtUsd(v, 0)}
              dateTickFormatter={fmtDate}
            />
          </div>
          <BacktestWarnings warnings={result.warnings} />
        </div>
      )}
    </div>
  )
}
