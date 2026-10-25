'use client'

import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'
import { StrategyCard } from '@widgets/strategy-card'
import { NewAccountButton } from '@features/account/create-account'
import { useAllStrategiesQuery } from '@entities/strategy'
import { useAccountsQuery } from '@entities/account'
import { useMeta } from '@entities/meta'
import type { Account } from '@entities/account'
import { Badge } from '@shared/ui/Badge'
import { EmptyState } from '@shared/ui/EmptyState'
import { LoadingRow } from '@shared/ui/LoadingRow'
import { SectionError } from '@shared/ui/SectionError'
import { useSearchParam } from '@shared/lib/hooks/use-search-param'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

function StrategiesEmptyState({ accounts }: { accounts: Account[] }) {
  const hasAccounts = accounts.length > 0

  return (
    <EmptyState
      icon={<TrendingUp className="size-7 text-muted-foreground" />}
      title="등록된 전략이 없습니다"
      message={hasAccounts ? '전략을 추가할 계좌를 선택하세요.' : '계좌를 먼저 등록한 후 전략을 추가하세요.'}
      action={
        hasAccounts ? (
          // 헤더의 "전략 추가"와 같은 생성 라우트(PC는 @modal 인터셉트)로 바로 보낸다
          <div className="flex flex-col gap-2 w-full max-w-xs">
            {accounts.map((account) => (
              <Link
                key={account.id}
                href={`/accounts/${account.id}/strategies/new`}
                className="flex items-center justify-between px-4 py-2.5 rounded-[var(--r-md)] border border-border bg-card hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-[border-color,box-shadow] text-sm"
              >
                <span className="font-medium text-foreground">{account.nickname}</span>
                <ChevronRight className="size-3.5 text-muted-foreground" />
              </Link>
            ))}
          </div>
        ) : (
          <NewAccountButton>계좌 등록하기</NewAccountButton>
        )
      }
    />
  )
}

const ALL = 'ALL'

export function AllStrategiesList() {
  const [param, setParam] = useSearchParam('account')
  const strategiesQuery = useAllStrategiesQuery()
  const accountsQuery = useAccountsQuery()
  const { findBroker } = useMeta()
  const strategies = strategiesQuery.data
  const accounts = accountsQuery.data

  // 계좌 목록이 없으면 전략을 계좌별로 묶을 수 없어 빈 화면이 되므로 두 쿼리를 함께 게이팅한다
  if ((!strategies && strategiesQuery.isError) || (!accounts && accountsQuery.isError))
    return <SectionError message="전략 목록을 불러오지 못했습니다." />
  if (!strategies || !accounts) return <LoadingRow />

  if (strategies.length === 0)
    return <StrategiesEmptyState accounts={accounts} />

  const groupByAccount = accounts.length > 1

  // 계좌 등록 순서를 유지한 채 계좌별 전략을 그룹핑 — 전략이 없는 계좌는 섹션 생략
  const groups = accounts.flatMap((account) => {
    const accountStrategies = strategies.filter((s) => s.accountId === account.id)
    return accountStrategies.length > 0 ? [{ account, strategies: accountStrategies }] : []
  })

  const showFilter = groupByAccount && groups.length > 1
  const selected = showFilter && groups.some((g) => g.account.id === param) ? param! : ALL
  const shown = selected === ALL ? groups : groups.filter((g) => g.account.id === selected)
  const filterItems = [
    { value: ALL, label: '전체 계좌' },
    ...groups.map(({ account }) => ({ value: account.id, label: `${account.nickname} (${findBroker(account.broker)?.label ?? account.broker})` })),
  ]

  return (
    <div className="space-y-6 reveal-stagger">
      {showFilter && (
        <Select items={filterItems} value={selected} onValueChange={(value) => { if (value) setParam(value === ALL ? null : value) }}>
          <SelectTrigger aria-label="계좌 필터" className="w-full lg:w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            {filterItems.map(({ value, label }) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      {shown.map(({ account, strategies: accountStrategies }) => (
        <div key={account.id}>
          {groupByAccount && (
            <div className="flex items-center gap-2 mb-2.5">
              <Badge tone="none" size="sm" className="rounded-sm bg-accent text-accent-foreground">{findBroker(account.broker)?.label ?? account.broker}</Badge>
              <h2 className="text-sm font-semibold text-foreground">{account.nickname}</h2>
            </div>
          )}
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-4 lg:gap-3">
            {accountStrategies.map((s) => (
              <StrategyCard
                key={s.id}
                accountId={s.accountId}
                broker={account.broker}
                strategy={s}
                accountLabel={groupByAccount ? undefined : account.nickname}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
