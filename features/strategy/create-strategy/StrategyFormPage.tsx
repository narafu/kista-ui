'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { strategyDetailQueryOptions } from '@entities/strategy'
import { StrategyForm } from './StrategyForm'
import type { Strategy } from '@entities/strategy'
import type { BrokerCode } from '@entities/account'

interface Props {
  accountId: string
  broker?: BrokerCode
  initial?: Strategy
}

export function StrategyFormPage({ accountId, broker, initial }: Props) {
  const router = useRouter()
  // 체결로 바뀌는 currentHoldings(시드 수정 가능 여부)·vr.value를 detail 캐시에서 읽어 체결 무효화에 따라간다
  const { data: live } = useQuery({
    ...strategyDetailQueryOptions(accountId, initial?.id ?? ''),
    enabled: !!initial,
  })
  const strategy = initial ? (live ?? initial) : undefined
  const backHref = initial
    ? `/accounts/${accountId}/strategies/${initial.id}`
    : `/accounts/${accountId}`
  const handleDone = () => router.push(backHref)

  return (
    <StrategyForm
      accountId={accountId}
      broker={broker}
      initial={strategy}
      onSuccess={handleDone}
      onCancel={handleDone}
    />
  )
}
