'use client'

import { useState } from 'react'
import { fmtUsd, fmtKrw } from '@shared/lib/format'
import type { PortfolioAccountEntry } from '@widgets/dashboard/aggregatePortfolios'

interface Props {
  totalDepositUsd: number
  totalPosEvalUsd: number
  totalAssetUsd: number
  exchangeRate: number
  accountEntries: PortfolioAccountEntry[]
  variant?: 'desktop' | 'mobile'
}

export function DashboardKpiSection({
  totalDepositUsd,
  totalPosEvalUsd,
  totalAssetUsd,
  exchangeRate,
  accountEntries,
  variant = 'desktop',
}: Props) {
  const [currency, setCurrency] = useState<'USD' | 'KRW'>('USD')
  const hasRate = exchangeRate > 0
  const isKrw = currency === 'KRW' && hasRate

  function fmt(usd: number) {
    if (isKrw) return `₩${fmtKrw(usd * exchangeRate)}`
    return `$${fmtUsd(usd)}`
  }

  const toggle = (
    <div className="flex justify-end mb-3">
      <div className="inline-flex rounded-md border border-border overflow-hidden text-xs font-semibold">
        {(['USD', 'KRW'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setCurrency(c)}
            disabled={c === 'KRW' && !hasRate}
            className={
              currency === c
                ? 'px-3 py-1 bg-rose-600 text-white'
                : 'px-3 py-1 text-muted-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:pointer-events-none'
            }
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )

  const cards = [
    { label: '예수금', value: totalDepositUsd, entries: accountEntries.map(e => ({ id: e.accountId, nickname: e.nickname, usd: e.usdDeposit })) },
    { label: '평가금', value: totalPosEvalUsd, entries: accountEntries.map(e => ({ id: e.accountId, nickname: e.nickname, usd: e.posEvalUsd })) },
    { label: '총 자산', value: totalAssetUsd, entries: accountEntries.map(e => ({ id: e.accountId, nickname: e.nickname, usd: e.totalAssetUsd })) },
  ]

  if (variant === 'mobile') {
    return (
      <>
        {toggle}
        <div className="flex flex-col gap-3 mb-4">
          {cards.map(({ label, value, entries }) => (
            <div
              key={label}
              className="rounded-[var(--r-lg)] border border-rose-200 p-5"
              style={{ background: 'var(--brand-soft-bg)' }}
            >
              <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)] mb-1.5">
                {label}
              </p>
              <div className="text-[26px] font-extrabold text-[var(--brand-fg)] leading-tight mb-3">
                {fmt(value)}
              </div>
              {entries.length > 1 && (
                <div className="space-y-1 border-t border-rose-200/60 pt-2">
                  {entries.map(({ id, nickname, usd }) => (
                    <div key={id} className="flex justify-between text-[12px] text-[var(--brand-fg-soft)]">
                      <span className="truncate max-w-[60%]">{nickname}</span>
                      <span className="font-semibold">{fmt(usd)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </>
    )
  }

  // desktop: col-span-3 안에 toggle + 3 KPI 카드
  return (
    <div className="col-span-3 flex flex-col">
      {toggle}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {cards.map(({ label, value, entries }) => (
          <div
            key={label}
            className="rounded-[var(--r-lg)] border border-rose-200 p-5 flex flex-col"
            style={{ background: 'var(--brand-soft-bg)' }}
          >
            <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--brand-fg-soft)] mb-1.5">
              {label}
            </p>
            <div className="text-[24px] font-extrabold text-[var(--brand-fg)] leading-tight mb-3">
              {fmt(value)}
            </div>
            {entries.length > 1 && (
              <div className="space-y-1 border-t border-rose-200/60 pt-2 mt-auto">
                {entries.map(({ nickname, usd }) => (
                  <div key={nickname} className="flex justify-between text-[12px] text-[var(--brand-fg-soft)]">
                    <span className="truncate max-w-[60%]">{nickname}</span>
                    <span className="font-semibold">{fmt(usd)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
