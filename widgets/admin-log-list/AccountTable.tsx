'use client'

import { useMemo } from 'react'
import { RevealableValue } from '@widgets/revealable-value'
import type { AdminAnomalyAccount } from '@entities/admin'
import { SortableHeadCell } from '@shared/ui/SortableHeadCell'
import { useTableSort } from '@shared/lib/hooks/use-table-sort'
import { TableDataCell } from '@shared/ui/TableDataCell'

type SortKey = 'default' | 'ownerNickname' | 'nickname' | 'accountNo'

export function AccountTable({ accounts, label }: { accounts: AdminAnomalyAccount[]; label: string }) {
  // 'default'는 헤더에 없는 키 — API 응답 순서 유지
  const { sortKey, sortDirection, handleSort } = useTableSort<SortKey>('default')
  const sorted = useMemo(() => {
    if (sortKey === 'default') return accounts
    const dir = sortDirection === 'asc' ? 1 : -1
    return [...accounts].sort((a, b) => {
      const av = a[sortKey] || null, bv = b[sortKey] || null // 빈 값은 방향과 무관하게 맨 아래
      if (av == null) return bv == null ? 0 : 1
      if (bv == null) return -1
      return dir * av.localeCompare(bv, 'ko')
    })
  }, [accounts, sortKey, sortDirection])
  const head = { activeKey: sortKey, direction: sortDirection, onSort: handleSort }
  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="min-w-[320px] w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <SortableHeadCell sortKey="ownerNickname" className="whitespace-nowrap" {...head}>소유자</SortableHeadCell>
            <SortableHeadCell sortKey="nickname" className="whitespace-nowrap" {...head}>계좌명</SortableHeadCell>
            <SortableHeadCell sortKey="accountNo" className="whitespace-nowrap" {...head}>계좌번호</SortableHeadCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((a) => (
            <tr key={a.id} className="hover:bg-muted/30">
              <TableDataCell className="font-medium">{a.ownerNickname}</TableDataCell>
              <TableDataCell className="whitespace-nowrap">{a.nickname || '-'}</TableDataCell>
              <TableDataCell className="font-mono text-sm text-muted-foreground">
                {a.accountNo == null ? '-' : (
                  <RevealableValue
                    value={a.accountNo}
                    hiddenDisplay={a.accountNoMasked ?? ''}
                  />
                )}
              </TableDataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
