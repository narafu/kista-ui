'use client'

import { useState } from 'react'
import { fmtUsd, fmtKrw } from '@shared/lib/format'
import { KpiCard } from '@widgets/kpi-card'
import { ProfitDisplay } from '@widgets/profit-display'

interface Props {
  totalAssetKrw: number
  totalEvalProfitKrw: number
  totalAssetUsd: number
  totalEvalProfitUsd: number
  weightedReturnRate: number
  marketValueUsd: number
  /** 데스크탑: KpiCard 2개 나란히 / 모바일: 박스 스택 */
  variant?: 'desktop' | 'mobile'
}

export function DashboardKpiSection({
  totalAssetKrw,
  totalEvalProfitKrw,
  totalAssetUsd,
  totalEvalProfitUsd,
  weightedReturnRate,
  marketValueUsd,
  variant = 'desktop',
}: Props) {
  const [currency, setCurrency] = useState<'KRW' | 'USD'>('KRW')
  const noProfit = marketValueUsd === 0
  const isKrw = currency === 'KRW'

  const evalProfit = isKrw ? totalEvalProfitKrw : totalEvalProfitUsd
  const totalAsset = isKrw ? totalAssetKrw : totalAssetUsd

  const toggle = (
    <div className="flex justify-end mb-2">
      <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-semibold">
        {(['KRW', 'USD'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            className={
              currency === c
                ? 'px-3 py-1 bg-rose-600 text-white'
                : 'px-3 py-1 text-muted-foreground hover:bg-accent transition-colors'
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )

  if (variant === 'mobile') {
    return (
      <>
        {toggle}
        <div
          className="rounded-[var(--r-lg)] border border-rose-200 p-5 mb-3"
          style={{ background: 'var(--brand-soft-bg)' }}
        >
          <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-[var(--brand-fg-soft)] mb-1.5">총 자산</p>
          <div className="text-[30px] font-extrabold text-[var(--brand-fg)] leading-tight">
            {isKrw ? `₩${fmtKrw(totalAsset)}` : `$${fmtUsd(totalAsset)}`}
          </div>
        </div>
        <div className="rounded-[var(--r-lg)] border border-border bg-card p-5 mb-4">
          <p className="text-[11.5px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-2">총 평가손익</p>
          {noProfit ? (
            <span className="text-base text-muted-foreground font-medium">데이터 없음</span>
          ) : (
            <ProfitDisplay amount={evalProfit} rate={weightedReturnRate} size="lg" full currency={currency} />
          )}
        </div>
      </>
    )
  }

  // desktop: col-span-2 그리드 내 toggle + 2 KpiCard
  return (
    <div className="col-span-2 flex flex-col">
      {toggle}
      <div className="grid grid-cols-2 gap-4 flex-1">
        <KpiCard
          label="총 평가손익"
          value={
            noProfit
              ? <span className="text-muted-foreground text-base font-medium">데이터 없음</span>
              : <ProfitDisplay amount={evalProfit} rate={weightedReturnRate} size="lg" full currency={currency} />
          }
          sub="현재 보유 포지션 기준"
        />
        <KpiCard
          variant="soft"
          label={`총 자산 (${currency})`}
          value={isKrw ? `₩${fmtKrw(totalAsset)}` : `$${fmtUsd(totalAsset)}`}
          sub={isKrw ? `평가금액 $${fmtUsd(marketValueUsd)} (USD)` : 'USD 포지션 평가금액 기준'}
        />
      </div>
    </div>
  )
}
