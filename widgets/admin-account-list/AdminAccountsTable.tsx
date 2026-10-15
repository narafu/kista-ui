'use client'

import { formatBrokerLabel } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'
import { strategyStatusAccent, strategyTypeShort } from '@entities/strategy'
import type { AdminAccount, AdminAccountStrategy } from '@entities/admin'
import { Badge } from '@shared/ui/Badge'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'

const HEAD_CLASS = 'text-left text-xs lg:text-sm whitespace-nowrap'

function StrategyBadge({ strategy, statusLabel }: { strategy: AdminAccountStrategy; statusLabel: string }) {
  const color = strategyStatusAccent(strategy.status)
  return (
    <Badge tone='none' size='sm' className="border bg-muted/40 font-bold" style={{ borderColor: color, color }}>
      {strategyTypeShort(strategy.type)}-{strategy.ticker}
      {strategy.status !== 'ACTIVE' && ` · ${statusLabel}`}
    </Badge>
  )
}

export function AdminAccountsTable({ accounts }: { accounts: AdminAccount[] }) {
  const { labelOf } = useMeta()

  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto" role="region" aria-label="계좌 목록" tabIndex={0}>
      <table className="min-w-[720px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <TableHeadCell className={HEAD_CLASS}>소유자</TableHeadCell>
            <TableHeadCell className={HEAD_CLASS}>증권사</TableHeadCell>
            <TableHeadCell className={HEAD_CLASS}>계좌번호</TableHeadCell>
            <TableHeadCell className={HEAD_CLASS}>전략</TableHeadCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((acc) => (
            <tr key={acc.id} className="hover:bg-muted/20 transition-colors">
              <TableDataCell className="text-left font-medium">{acc.ownerNickname}</TableDataCell>
              <TableDataCell className="text-left text-muted-foreground">{acc.broker ? formatBrokerLabel(acc.broker) : '-'}</TableDataCell>
              {/* 서버가 이미 마스킹해 내려주는 번호라 공개 토글이 없다 */}
              <TableDataCell className="text-left text-muted-foreground font-mono text-xs">{acc.accountNoMasked || '-'}</TableDataCell>
              <TableDataCell className="text-left">
                {acc.strategies.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {acc.strategies.map((s) => (
                      <StrategyBadge key={s.id} strategy={s} statusLabel={labelOf('strategyStatuses', s.status)} />
                    ))}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </TableDataCell>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
