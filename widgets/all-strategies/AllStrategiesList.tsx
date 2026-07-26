'use client'

import { Suspense, use, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { StrategyCard } from '@widgets/strategy-card'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useAccountsQuery } from '@entities/account'
import { useMeta } from '@entities/meta'
import type { Strategy } from '@entities/strategy'
import type { Account } from '@entities/account'
import type { NextOrderPreview } from '@entities/order'
import { Spinner } from '@shared/ui/Spinner'
import { EmptyState } from '@shared/ui/EmptyState'
import { CardSkeleton } from '@shared/ui/CardSkeleton'
interface Props {
  previewsPromise: Promise<Record<string, NextOrderPreview>>
}

interface StrategyCardSlotProps {
  accountId: string
  strategy: Strategy
  accountLabel?: string
  previewsPromise: Promise<Record<string, NextOrderPreview>>
}

// previewsPromise를 use()로 unwrap하는 부분만 카드 단위 Suspense로 격리해, 배치 프리뷰 조회가
// 아직 끝나지 않아도 전략 카드 그리드 자체는 즉시 렌더링되게 한다 (첫 페인트를 블로킹하지 않음)
function StrategyCardSlot({ accountId, strategy, accountLabel, previewsPromise }: StrategyCardSlotProps) {
  const previews = use(previewsPromise)
  return (
    <StrategyCard
      accountId={accountId}
      strategy={strategy}
      accountLabel={accountLabel}
      initialPreview={previews[strategy.id]}
    />
  )
}

function StrategiesEmptyState({ accounts }: { accounts: Account[] }) {
  const hasAccounts = accounts.length > 0
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleNavigateToAccounts() {
    startTransition(() => router.push('/accounts'))
  }

  return (
    <EmptyState
      icon={<TrendingUp className="size-7 text-muted-foreground" />}
      title="등록된 전략이 없습니다"
      message={hasAccounts ? '계좌 상세 페이지에서 전략을 추가할 수 있습니다.' : '계좌를 먼저 등록한 후 전략을 추가해 주세요.'}
      action={
        hasAccounts ? (
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {accounts.slice(0, 3).map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}`}
                className="flex items-center justify-between px-4 py-2.5 rounded-[var(--r-md)] border border-border bg-card hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all text-sm"
              >
                <span className="font-medium text-foreground">{account.nickname}</span>
                <span className="flex items-center gap-1 text-muted-foreground text-sm">
                  <ChevronRight className="size-3.5" />
                </span>
              </Link>
            ))}
            {accounts.length > 3 && (
              <Link
                href="/accounts"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                계좌 {accounts.length - 3}개 더 보기
              </Link>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNavigateToAccounts}
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[var(--r-md)] text-sm font-medium transition-colors disabled:opacity-60"
            style={{ background: 'var(--rose-50)', color: 'var(--rose-600)' }}
          >
            {isPending ? (
              <>
                <Spinner size={16} />
                이동 중...
              </>
            ) : (
              <>
                계좌 등록하러 가기
                <ChevronRight className="size-4" />
              </>
            )}
          </button>
        )
      }
    />
  )
}

export function AllStrategiesList({ previewsPromise }: Props) {
  const { data: strategies = [] } = useAllStrategiesQuery()
  const { data: accounts = [] } = useAccountsQuery()
  const { findBroker } = useMeta()

  if (strategies.length === 0)
    return <StrategiesEmptyState accounts={accounts} />

  const groupByAccount = accounts.length > 1

  // 계좌 등록 순서를 유지한 채 계좌별 전략을 그룹핑 — 전략이 없는 계좌는 섹션 생략
  const groups = accounts
    .map((account) => ({
      account,
      strategies: strategies.filter((s) => s.accountId === account.id),
    }))
    .filter((g) => g.strategies.length > 0)

  // NOTE: 초대제 SaaS 규모상 전략 5개 수준 — 100+ 전략 시 페이지네이션 재검토
  return (
    <div className="space-y-6 reveal-stagger">
      {groups.map(({ account, strategies: accountStrategies }) => (
        <div key={account.id}>
          {groupByAccount && (
            <div className="flex items-center gap-2 mb-2.5">
              <span
                className="inline-flex items-center px-2 h-[19px] rounded-sm text-xs font-semibold shrink-0 bg-accent text-accent-foreground"
              >
                {findBroker(account.broker)?.label ?? account.broker}
              </span>
              <h2 className="text-sm font-semibold text-foreground">{account.nickname}</h2>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-3">
            {accountStrategies.map((s) => (
              <Suspense
                key={s.id}
                // 카드 컴포넌트를 fallback으로 재사용하면 useStrategyOrderPreviewQuery가 배치 조회와
                // 별도로 카드마다 개별 요청을 쏴 배치 조회 취지가 무색해진다 — 순수 스켈레톤만 사용
                fallback={<CardSkeleton className="h-16 lg:h-40" />}
              >
                <StrategyCardSlot
                  accountId={s.accountId}
                  strategy={s}
                  accountLabel={groupByAccount ? undefined : account.nickname}
                  previewsPromise={previewsPromise}
                />
              </Suspense>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
