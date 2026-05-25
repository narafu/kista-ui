'use client'

import Link from 'next/link'
import { StatusDot } from './StatusDot'
import type { Account } from '@/types/account'
import type { Strategy } from '@/types/strategy'

interface Props {
  account: Account
  strategies?: Strategy[]
}

export function AccountCard({ account, strategies = [] }: Props) {
  // 운영상 계좌당 1건이지만, 방어적으로 첫 번째만 표시
  const primary = strategies[0]
  const typeLabel = primary?.type ?? null

  return (
    <Link
      href={`/accounts/${account.id}`}
      className="group block rounded-[var(--r-lg)] border border-border bg-card p-5 shadow-[var(--sh-card)] hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-semibold text-base text-foreground leading-snug">{account.nickname}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{account.accountNoMasked}</p>
        </div>
        {primary ? (
          <StatusDot status={(primary.status as 'ACTIVE' | 'PAUSED') ?? 'UNKNOWN'} />
        ) : (
          <StatusDot status="UNKNOWN" />
        )}
      </div>
      <div className="flex items-center gap-2 mb-3">
        {primary ? (
          <>
            <span
              className="inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap bg-rose-50 text-rose-600"
            >
              {typeLabel}
            </span>
            <span className="text-xs text-muted-foreground">{primary.ticker}</span>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">전략 미등록</span>
        )}
      </div>
    </Link>
  )
}
