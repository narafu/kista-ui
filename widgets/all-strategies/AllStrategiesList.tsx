'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { StrategyCard } from '@widgets/strategy-card'
import { RevealableValue } from '@widgets/revealable-value'
import { useAllStrategiesQuery } from '@entities/strategy'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'

const PAGE_SIZE = 12

interface Props {
  strategies: Strategy[]
  accounts: Account[]
}

function EmptyState({ accounts }: { accounts: Account[] }) {
  const hasAccounts = accounts.length > 0
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  function handleNavigateToAccounts() {
    if (isLoading) return
    setIsLoading(true)
    router.push('/accounts')
  }

  return (
    <div className="flex flex-col items-center gap-5 py-16 text-center">
      <div className="rounded-full bg-muted p-4">
        <TrendingUp className="size-7 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">등록된 전략이 없습니다</p>
        <p className="text-sm text-muted-foreground">
          {hasAccounts
            ? '계좌 상세 페이지에서 전략을 추가할 수 있습니다.'
            : '계좌를 먼저 등록한 후 전략을 추가해 주세요.'}
        </p>
      </div>
      {hasAccounts ? (
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {accounts.slice(0, 3).map((account) => (
            <Link
              key={account.id}
              href={`/accounts/${account.id}`}
              className="flex items-center justify-between px-4 py-2.5 rounded-[var(--r-md)] border border-border bg-card hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all text-sm"
            >
              <span className="font-medium text-foreground">{account.nickname}</span>
              <span className="flex items-center gap-1 text-muted-foreground text-xs">
                <RevealableValue
                  value={account.accountNo ?? account.accountNoMasked}
                  hiddenDisplay={account.accountNoMasked}
                />
                <ChevronRight className="size-3.5" />
              </span>
            </Link>
          ))}
          {accounts.length > 3 && (
            <Link
              href="/accounts"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              계좌 {accounts.length - 3}개 더 보기
            </Link>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={handleNavigateToAccounts}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] text-sm font-medium transition-colors disabled:opacity-60"
          style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              이동 중...
            </>
          ) : (
            <>
              계좌 등록하러 가기
              <ChevronRight className="size-4" />
            </>
          )}
        </button>
      )}
    </div>
  )
}

export function AllStrategiesList({ strategies: initialStrategies, accounts }: Props) {
  const { data: strategies = initialStrategies } = useAllStrategiesQuery(initialStrategies)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

  if (strategies.length === 0)
    return <EmptyState accounts={accounts} />

  const accountMap = new Map(
    accounts.map((a) => [
      a.id,
      <RevealableValue
        key={a.id}
        value={a.accountNo ?? a.accountNoMasked}
        hiddenDisplay={a.accountNoMasked}
      />,
    ])
  )

  const visible = strategies.slice(0, visibleCount)
  const hasMore = visibleCount < strategies.length

  return (
    <div>
      <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-3">
        {visible.map((s) => (
          <StrategyCard
            key={s.id}
            accountId={s.accountId}
            strategy={s}
            accountLabel={accountMap.get(s.accountId)}
          />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-5 py-2 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            더 보기 ({strategies.length - visibleCount}개 남음)
          </button>
        </div>
      )}
    </div>
  )
}
