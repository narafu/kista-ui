'use client'

import { useRouter } from 'next/navigation'
import { StrategyForm } from './StrategyForm'
import type { Strategy } from '@entities/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  // 'push': 일반 페이지 라우트 — 상세 페이지로 이동. 'back': 인터셉팅 라우트(모달) — 이전 화면으로 복귀
  dismiss?: 'push' | 'back'
}

export function StrategyFormPage({ accountId, initial, dismiss = 'push' }: Props) {
  const router = useRouter()
  const backHref = initial
    ? `/accounts/${accountId}/strategies/${initial.id}`
    : `/accounts/${accountId}`
  const handleDone = dismiss === 'back' ? () => router.back() : () => router.push(backHref)

  return (
    <StrategyForm
      accountId={accountId}
      initial={initial}
      onSuccess={handleDone}
      onCancel={handleDone}
    />
  )
}
