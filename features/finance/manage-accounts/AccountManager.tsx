'use client'

import { useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@shared/lib/utils'
import { useMeta } from '@entities/meta'
import { useFinanceAccountsQuery } from '@entities/finance'
import type { FinanceAccount } from '@entities/finance'
import { AccountFormDialog } from './AccountFormDialog'
import { DeleteAccountDialog } from './DeleteAccountDialog'

// accountNo는 kista-api가 복호화한 평문으로 내려온다 — 목록 화면에는 뒷자리만 남기고 마스킹한다.
function maskAccountNo(accountNo: string) {
  const last4 = accountNo.slice(-4)
  return accountNo.length <= 4 ? '•'.repeat(accountNo.length) : `••••${last4}`
}

const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

export function AccountManager() {
  const { data: accounts = [] } = useFinanceAccountsQuery()
  const { meta } = useMeta()
  const [formTarget, setFormTarget] = useState<FinanceAccount | 'new' | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<FinanceAccount | null>(null)

  function accountTypeLabel(accountType: FinanceAccount['accountType']) {
    return meta.financeAccountTypes.find((t) => t.code === accountType)?.label ?? accountType
  }

  return (
    <div className={cn(cardClass, 'space-y-4')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">계좌 관리</h2>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setFormTarget('new')}>
          <Plus className="size-3.5" />
          계좌 추가
        </Button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">등록된 계좌가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border">
          {accounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0">{accountTypeLabel(account.accountType)}</span>
                  <span className="font-medium truncate">{account.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {account.accountNo && <span className="tabular-nums">{maskAccountNo(account.accountNo)}</span>}
                  {account.memo && <span className="truncate">{account.memo}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${account.name} 계좌 수정`}
                  onClick={() => setFormTarget(account)}
                >
                  <Pencil className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${account.name} 계좌 삭제`}
                  onClick={() => setDeleteTarget(account)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {formTarget && (
        <AccountFormDialog
          open
          onOpenChange={(next) => { if (!next) setFormTarget(null) }}
          account={formTarget === 'new' ? undefined : formTarget}
        />
      )}

      {deleteTarget && (
        <DeleteAccountDialog
          open
          onOpenChange={(next) => { if (!next) setDeleteTarget(null) }}
          account={deleteTarget}
        />
      )}
    </div>
  )
}
