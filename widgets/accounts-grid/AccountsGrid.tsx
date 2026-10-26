'use client'

import { useState } from 'react'
import { AccountCard } from '@widgets/account-card'
import { sortMockLast } from '@entities/account'
import type { Account } from '@entities/account'
import { useMeta } from '@entities/meta'
import { SegmentedToggle } from '@shared/ui/SegmentedToggle'
import { useSearchParam } from '@shared/lib/hooks/use-search-param'
import { Button } from '@/components/ui/button'

const PAGE_SIZE = 12
const ALL = 'ALL'

interface Props {
  accounts: Account[]
}

function AccountCards({ accounts }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = accounts.slice(0, visibleCount)
  const hasMore = visibleCount < accounts.length

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((account) => (
          <AccountCard key={account.id} account={account} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <Button type="button" variant="outline" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}>
            더 보기 ({accounts.length - visibleCount}개 남음)
          </Button>
        </div>
      )}
    </div>
  )
}

export function AccountsGrid({ accounts: unsorted }: Props) {
  const accounts = sortMockLast(unsorted)
  const [param, setParam] = useSearchParam('broker')
  const { findBroker } = useMeta()

  // 계좌 목록 등장 순서대로 증권사별 개수를 센다
  const counts = new Map<string, number>()
  accounts.forEach((a) => counts.set(a.broker, (counts.get(a.broker) ?? 0) + 1))

  const broker = param && counts.has(param) ? param : ALL
  const filtered = broker === ALL ? accounts : accounts.filter((a) => a.broker === broker)

  return (
    <div className="space-y-4">
      {counts.size > 1 && (
        <div className="overflow-x-auto">
          <SegmentedToggle
            aria-label="증권사·거래소 필터"
            options={[
              { value: ALL, label: `전체 ${accounts.length}` },
              ...[...counts].map(([code, count]) => ({ value: code, label: `${findBroker(code)?.label ?? code} ${count}` })),
            ]}
            value={broker}
            onChange={(next) => setParam(next === ALL ? null : next)}
          />
        </div>
      )}
      <AccountCards key={broker} accounts={filtered} />
    </div>
  )
}
