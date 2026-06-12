'use client'

import Link from 'next/link'
import { StatusDot } from '@widgets/status-dot'
import type { Account, BrokerCode } from '@entities/account'
import type { Strategy } from '@entities/strategy'

const BROKER_LABELS: Record<BrokerCode, string> = {
  KIS: '한국투자증권',
  TOSS: '토스증권',
}

interface Props {
  account: Account
  strategies?: Strategy[]
}

export function AccountCard({ account, strategies = [] }: Props) {
  const primary = strategies[0]
  const brokerLabel = BROKER_LABELS[account.broker] ?? account.broker

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group block rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-base text-foreground leading-snug">{account.nickname}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-muted-foreground">{account.accountNoMasked}</p>
            <span
              className="inline-flex items-center px-1.5 h-[18px] rounded text-[10px] font-semibold"
              style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
            >
              {brokerLabel}
            </span>
          </div>
        </div>
        <StatusDot status={(primary?.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
      </div>
      <div className="mb-1">
        {strategies.length > 0 ? (
          <ul className="space-y-1.5">
            {strategies.map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center px-2 h-[20px] rounded-full text-[10px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600">
                  {s.type}
                </span>
                <span className="text-muted-foreground">{s.ticker}</span>
                {s.initialUsdDeposit != null && (
                  <span className="ml-auto font-medium text-foreground">
                    ${s.initialUsdDeposit.toLocaleString('en-US')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <span className="text-xs text-muted-foreground">전략 미등록</span>
        )}
      </div>
    </Link>
  )
}
