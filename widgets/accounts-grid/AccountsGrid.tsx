'use client'

import { useState } from 'react'
import { AccountCard } from '@widgets/account-card'
import type { Account } from '@entities/account'
import type { Strategy } from '@entities/strategy'

const PAGE_SIZE = 12

interface Props {
  accounts: Account[]
  strategiesByAccount: Strategy[][]
}

export function AccountsGrid({ accounts, strategiesByAccount }: Props) {
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const visible = accounts.slice(0, visibleCount)
  const hasMore = visibleCount < accounts.length

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {visible.map((account, i) => (
          <AccountCard key={account.id} account={account} strategies={strategiesByAccount[i]} />
        ))}
      </div>
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            className="px-5 py-2 rounded-[var(--r-md)] text-sm font-medium text-muted-foreground border border-border hover:bg-muted transition-colors"
          >
            더 보기 ({accounts.length - visibleCount}개 남음)
          </button>
        </div>
      )}
    </div>
  )
}
