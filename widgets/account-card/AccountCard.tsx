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
      className="group block rounded-[var(--r-lg)] border border-border bg-card shadow-[var(--sh-card)] hover:border-rose-200 hover:shadow-[var(--sh-rose)] hover:-translate-y-0.5 transition-all duration-200 overflow-hidden"
    >
      {/* 로즈골드 그라디언트 액센트 바 */}
      <div
        className="h-[3px] w-full opacity-60 group-hover:opacity-100 transition-opacity duration-200"
        style={{ background: 'var(--primary-grad)' }}
      />

      <div className="p-5">
        {/* 헤더: 계좌명 + 번호 + 증권사 / 상태 */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <p className="font-semibold text-base text-foreground leading-tight truncate">
              {account.nickname}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-muted-foreground tracking-wider">
                {account.accountNoMasked}
              </span>
              <span
                className="inline-flex items-center px-2 h-[19px] rounded-sm text-[11px] font-semibold shrink-0"
                style={{ background: 'var(--accent)', color: 'var(--accent-foreground)' }}
              >
                {brokerLabel}
              </span>
            </div>
          </div>
          <StatusDot
            status={(primary?.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'}
            className="mt-0.5 shrink-0"
          />
        </div>

        {/* 구분선 */}
        <div className="h-px bg-border mb-3" />

        {/* 전략 목록 */}
        {strategies.length > 0 ? (
          <ul className="space-y-2">
            {strategies.map((s) => (
              <li key={s.id} className="flex items-center gap-2 min-w-0">
                <span
                  className="inline-flex items-center justify-center px-2 h-[20px] rounded-sm text-[10px] font-bold tracking-widest uppercase shrink-0"
                  style={{ background: 'var(--primary-grad)', color: '#ffffff' }}
                >
                  {s.type}
                </span>
                <span className="text-xs font-mono font-medium text-foreground/70 tracking-wider">
                  {s.ticker}
                </span>
                {s.initialUsdDeposit != null && (
                  <span className="ml-auto text-sm font-semibold text-foreground tabular-nums shrink-0">
                    ${s.initialUsdDeposit.toLocaleString('en-US')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">전략 미등록</p>
        )}
      </div>
    </Link>
  )
}
