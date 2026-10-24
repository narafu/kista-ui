'use client'

import { Suspense } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatBrokerLabel } from '@shared/lib/api-schema'
import { useMeta } from '@entities/meta'

const ALL = 'ALL'

interface Props {
  owners: { userId: string; label: string }[]
  pageParamKeys?: string[]
}

function AdminAccountsFilterBarContent({ owners, pageParamKeys = ['page'] }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { meta, labelOf } = useMeta()

  // 목록에 없는 owner 값(예전 링크 등)은 UUID가 그대로 보이므로 전체로 돌린다
  const rawOwner = searchParams.get('owner')
  const owner = rawOwner && owners.some((o) => o.userId === rawOwner) ? rawOwner : ALL
  const broker = searchParams.get('broker') ?? ALL
  const strategyType = searchParams.get('strategyType') ?? ALL

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value === ALL) params.delete(key)
    else params.set(key, value)
    pageParamKeys.forEach((k) => params.set(k, '1'))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Select
        items={[{ value: ALL, label: '전체 소유자' }, ...owners.map((o) => ({ value: o.userId, label: o.label }))]}
        value={owner}
        onValueChange={(v) => { if (v) setParam('owner', v) }}
      >
        <SelectTrigger aria-label="소유자 필터" className="h-9 text-sm min-w-28 max-w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>전체 소유자</SelectItem>
          {owners.map((o) => <SelectItem key={o.userId} value={o.userId}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        items={[{ value: ALL, label: '전체 증권사·거래소' }, ...meta.brokers.map((b) => ({ value: b.code, label: formatBrokerLabel(b.code) }))]}
        value={broker}
        onValueChange={(v) => { if (v) setParam('broker', v) }}
      >
        <SelectTrigger aria-label="증권사·거래소 필터" className="h-9 text-sm min-w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>전체 증권사·거래소</SelectItem>
          {meta.brokers.map((b) => <SelectItem key={b.code} value={b.code}>{formatBrokerLabel(b.code)}</SelectItem>)}
        </SelectContent>
      </Select>

      <Select
        items={[{ value: ALL, label: '전체 전략' }, ...meta.strategyTypes.map((t) => ({ value: t.code, label: labelOf('strategyTypes', t.code) }))]}
        value={strategyType}
        onValueChange={(v) => { if (v) setParam('strategyType', v) }}
      >
        <SelectTrigger aria-label="전략 유형 필터" className="h-9 text-sm min-w-24">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>전체 전략</SelectItem>
          {meta.strategyTypes.map((t) => <SelectItem key={t.code} value={t.code}>{labelOf('strategyTypes', t.code)}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  )
}

export function AdminAccountsFilterBar(props: Props) {
  return (
    <Suspense>
      <AdminAccountsFilterBarContent {...props} />
    </Suspense>
  )
}
