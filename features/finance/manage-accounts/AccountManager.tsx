'use client'

import { useMemo, useState } from 'react'
import { Plus, Pencil, Share2, Trash2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IconButton } from '@shared/ui/IconButton'
import { cn } from '@shared/lib/utils'
import { useConfirmDialog } from '@shared/lib/hooks/use-confirm-dialog'
import { useMeta } from '@entities/meta'
import {
  useCanShareToGroup,
  useFinanceAccountsQuery,
  useShareFinanceAccountMutation,
  useUnshareFinanceAccountMutation,
} from '@entities/finance'
import type { FinanceAccount, FinanceAccountType } from '@entities/finance'
import { AccountFormDialog } from './AccountFormDialog'
import { DeleteAccountDialog } from './DeleteAccountDialog'

// accountNo는 kista-api가 복호화한 평문으로 내려온다 — 목록 화면에는 뒷자리만 남기고 마스킹한다.
function maskAccountNo(accountNo: string) {
  const last4 = accountNo.slice(-4)
  return accountNo.length <= 4 ? '•'.repeat(accountNo.length) : `••••${last4}`
}

const cardClass = 'bg-card rounded-[1.25rem] py-7 px-6 shadow-[var(--sh-card)] border border-border'

type SortKey = 'createdAt' | 'name' | 'type'

const SORT_ITEMS: { value: SortKey; label: string }[] = [
  { value: 'createdAt', label: '등록순' },
  { value: 'name', label: '이름순' },
  { value: 'type', label: '유형순' },
]

export function AccountManager() {
  const { data: accounts = [] } = useFinanceAccountsQuery()
  const { meta } = useMeta()
  const [formTarget, setFormTarget] = useState<FinanceAccount | 'new' | null>(null)
  const deleteDialog = useConfirmDialog<FinanceAccount>()
  const [typeFilter, setTypeFilter] = useState<FinanceAccountType | 'ALL'>('ALL')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')

  const canShare = useCanShareToGroup()
  const shareMutation = useShareFinanceAccountMutation()
  const unshareMutation = useUnshareFinanceAccountMutation()

  function accountTypeLabel(accountType: FinanceAccount['accountType']) {
    return meta.financeAccountTypes.find((t) => t.code === accountType)?.label ?? accountType
  }

  // 필터 후 정렬 — 계좌 수가 적어 서버 API 없이 클라이언트에서 처리한다. '등록순'은 서버가
  // 반환한 원본 순서(생성 순서)를 그대로 유지하는 것이라 별도 정렬을 하지 않는다.
  const visibleAccounts = useMemo(() => {
    const filtered = typeFilter === 'ALL' ? accounts : accounts.filter((a) => a.accountType === typeFilter)
    if (sortKey === 'createdAt') return filtered
    if (sortKey === 'name') return [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    return [...filtered].sort((a, b) => accountTypeLabel(a.accountType).localeCompare(accountTypeLabel(b.accountType), 'ko'))
  }, [accounts, typeFilter, sortKey, meta.financeAccountTypes])

  return (
    <div className={cn(cardClass, 'space-y-4')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">계좌 관리</h2>
        <Button type="button" size="sm" className="gap-1.5" onClick={() => setFormTarget('new')}>
          <Plus className="size-3.5" />
          계좌 추가
        </Button>
      </div>

      {accounts.length > 0 && (
        <div className="flex items-center gap-2">
          <Select
            items={[{ value: 'ALL', label: '전체' }, ...meta.financeAccountTypes.map((t) => ({ value: t.code, label: t.label }))]}
            value={typeFilter}
            onValueChange={(value) => { if (value) setTypeFilter(value as FinanceAccountType | 'ALL') }}
          >
            <SelectTrigger aria-label="계좌 유형 필터" className="h-9 text-sm w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">전체</SelectItem>
              {meta.financeAccountTypes.map((t) => <SelectItem key={t.code} value={t.code}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select
            items={SORT_ITEMS}
            value={sortKey}
            onValueChange={(value) => { if (value) setSortKey(value as SortKey) }}
          >
            <SelectTrigger aria-label="정렬 기준" className="h-9 text-sm w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_ITEMS.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">등록된 계좌가 없습니다.</p>
      ) : visibleAccounts.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">조건에 맞는 계좌가 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border">
          {visibleAccounts.map((account) => (
            <li key={account.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0 flex items-center gap-2 text-sm">
                <span className="text-muted-foreground shrink-0">{accountTypeLabel(account.accountType)}</span>
                <span className="font-medium truncate min-w-0">{account.name}</span>
                {account.accountNo && <span className="text-xs text-muted-foreground tabular-nums shrink-0">{maskAccountNo(account.accountNo)}</span>}
                {account.memo && <span className="text-xs text-muted-foreground truncate min-w-0">{account.memo}</span>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {canShare && !account.groupId && (
                  <IconButton aria-label="공유" onClick={() => shareMutation.mutate(account.id)} disabled={shareMutation.isPending}>
                    <Share2 className="size-4" />
                  </IconButton>
                )}
                {canShare && account.groupId && (
                  <IconButton aria-label="귀속" onClick={() => unshareMutation.mutate(account.id)} disabled={unshareMutation.isPending}>
                    <Undo2 className="size-4" />
                  </IconButton>
                )}
                <IconButton aria-label="수정" onClick={() => setFormTarget(account)}>
                  <Pencil className="size-4" />
                </IconButton>
                <IconButton
                  aria-label="삭제"
                  onClick={() => deleteDialog.request(account)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </IconButton>
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

      {deleteDialog.target && (
        <DeleteAccountDialog
          open
          onOpenChange={deleteDialog.onOpenChange}
          account={deleteDialog.target}
        />
      )}
    </div>
  )
}
