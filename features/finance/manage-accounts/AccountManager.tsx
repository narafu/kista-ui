'use client'

import { useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ShareableRowActions } from '@shared/ui/ShareableRowActions'
import { BRAND_TINT_BUTTON_CLASS } from '@shared/ui/brand-button-class'
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

type SortKey = 'createdAt' | 'name'

const SORT_ITEMS: { value: SortKey; label: string }[] = [
  { value: 'createdAt', label: '등록순' },
  { value: 'name', label: '이름순' },
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

  // 필터 후 유형별로 묶는다 — 자산 등록 폼(AssetForm)의 계좌 Select와 동일하게 accountType별로
  // 그룹핑하고(순서는 meta.financeAccountTypes 기준) 그룹 내에서는 sortKey로 정렬한다. 계좌 수가
  // 적어 서버 API 없이 클라이언트에서 처리한다. '등록순'은 서버가 반환한 원본 순서(생성 순서)를
  // 그대로 유지하는 것이라 별도 정렬을 하지 않는다.
  const groupedAccounts = useMemo(() => {
    const filtered = typeFilter === 'ALL' ? accounts : accounts.filter((a) => a.accountType === typeFilter)
    const groups: { type: string; label: string; accounts: FinanceAccount[] }[] = []
    for (const typeMeta of meta.financeAccountTypes) {
      const inType = filtered.filter((a) => a.accountType === typeMeta.code)
      if (sortKey === 'name') inType.sort((a, b) => a.name.localeCompare(b.name, 'ko'))
      if (inType.length > 0) groups.push({ type: typeMeta.code, label: typeMeta.label, accounts: inType })
    }
    return groups
  }, [accounts, typeFilter, sortKey, meta.financeAccountTypes])
  const visibleAccounts = useMemo(() => groupedAccounts.flatMap((g) => g.accounts), [groupedAccounts])

  return (
    <div className={cn(cardClass, 'space-y-4')}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">계좌 관리</h2>
        <Button type="button" size="sm" className={cn('gap-1.5', BRAND_TINT_BUTTON_CLASS)} onClick={() => setFormTarget('new')}>
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
        <div className="space-y-4">
          {groupedAccounts.map((group) => (
            <div key={group.type} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{group.label}</p>
              <ul className="divide-y divide-border">
                {group.accounts.map((account) => (
                  <li key={account.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex items-center gap-2 text-sm">
                      <span className="font-medium truncate min-w-0">{account.name}</span>
                      {account.accountNo && <span className="text-xs text-muted-foreground tabular-nums shrink-0">{maskAccountNo(account.accountNo)}</span>}
                      {account.memo && <span className="text-xs text-muted-foreground truncate min-w-0">{account.memo}</span>}
                    </div>
                    <ShareableRowActions
                      canShare={canShare}
                      hasGroupId={!!account.groupId}
                      onShare={() => shareMutation.mutate(account.id)}
                      onUnshare={() => unshareMutation.mutate(account.id)}
                      sharePending={shareMutation.isPending}
                      unsharePending={unshareMutation.isPending}
                      onEdit={() => setFormTarget(account)}
                      onDelete={() => deleteDialog.request(account)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
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
