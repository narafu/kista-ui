'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { BRAND_GRADIENT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAccountsQuery } from '@entities/account'
import { useMeta } from '@entities/meta'
import { NewStrategyButton } from './NewStrategyButton'

// 전략 목록(/strategies)용 진입점 — 전략은 계좌에 종속되므로 계좌를 먼저 고른 뒤 기존
// /accounts/{id}/strategies/new 라우트(PC는 @modal 인터셉트)로 보낸다. 계좌가 1개면 선택 없이 바로 이동,
// 0개면 렌더하지 않는다(빈 상태 화면이 계좌 등록을 안내한다).
export function AddStrategyButton() {
  const { data: accounts = [] } = useAccountsQuery()
  const { findBroker } = useMeta()
  const [open, setOpen] = useState(false)

  if (accounts.length === 0) return null
  if (accounts.length === 1) return <NewStrategyButton accountId={accounts[0].id} />

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn('inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-xs', BRAND_GRADIENT_BUTTON_CLASS)}>
        <Plus className="size-3.5" />
        전략 추가
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60 gap-1 p-1.5">
        <p className="px-2 py-1.5 text-xs text-muted-foreground">전략을 추가할 계좌 선택</p>
        {accounts.map((account) => (
          <Link
            key={account.id}
            href={`/accounts/${account.id}/strategies/new`}
            onClick={() => setOpen(false)}
            className="flex items-center justify-between gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent"
          >
            <span className="truncate font-medium">{account.nickname}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{findBroker(account.broker)?.label ?? account.broker}</span>
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  )
}
