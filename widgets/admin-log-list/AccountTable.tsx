import { RevealableValue } from '@widgets/revealable-value'
import type { AdminAnomalyAccount } from '@entities/admin'

export function AccountTable({ accounts }: { accounts: AdminAnomalyAccount[] }) {
  return (
    <div className="rounded-xl border border-border overflow-x-auto">
      <table className="min-w-[320px] w-full text-sm">
        <thead className="bg-muted/40 border-b border-border">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">소유자</th>
            <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground">계좌번호</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {accounts.map((a) => (
            <tr key={a.id} className="hover:bg-muted/20">
              <td className="px-4 py-2.5 font-medium">{a.ownerNickname}</td>
              <td className="px-4 py-2.5 font-mono text-sm text-muted-foreground">
                <RevealableValue
                  value={a.accountNoMasked ?? ''}
                  hiddenDisplay={a.accountNoMasked ?? ''}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
