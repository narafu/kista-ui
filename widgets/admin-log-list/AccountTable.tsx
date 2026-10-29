import { RevealableValue } from '@widgets/revealable-value'
import type { AdminAnomalyAccount } from '@entities/admin'
import { TableHeadCell } from '@shared/ui/TableHeadCell'
import { TableDataCell } from '@shared/ui/TableDataCell'

export function AccountTable({ accounts, label }: { accounts: AdminAnomalyAccount[]; label: string }) {
  return (
    <div className="rounded-[var(--r-lg)] border border-border overflow-x-auto" role="region" aria-label={label} tabIndex={0}>
      <table className="min-w-[320px] w-full text-sm">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <TableHeadCell className="whitespace-nowrap">소유자</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">계좌명</TableHeadCell>
            <TableHeadCell className="whitespace-nowrap">계좌번호</TableHeadCell>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((a) => (
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
