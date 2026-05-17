'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StrategyBadge } from '@/components/common/StrategyBadge'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onBack: () => void
}

export function ConfirmStep({ data, onBack }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    setLoading(true)
    setError('')
    try {
      const { createAccount } = await import('@/lib/api/accounts')
      await createAccount({
        nickname: data.nickname,
        kisAppKey: data.apiKey,
        kisSecretKey: data.apiSecret,
        accountNo: data.accountNo,
        kisAccountType: data.kisAccountType,
        strategyType: data.strategyType as 'INFINITE' | 'PRIVACY',
        ticker: data.ticker as 'TQQQ' | 'SOXL',
      })
      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '계좌 연결에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">입력 확인</h2>
        <p className="text-sm text-muted-foreground">아래 정보로 계좌를 연결합니다.</p>
      </div>

      <div className="rounded-[var(--r-lg)] border border-border bg-card divide-y divide-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">별칭</span>
          <span className="text-sm font-semibold">{data.nickname}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">계좌번호</span>
          <span className="text-sm font-semibold">{data.accountNo}-{data.kisAccountType}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">전략</span>
          <span className="text-sm font-semibold">
            {data.strategyType
              ? <StrategyBadge strategy={data.strategyType as 'INFINITE' | 'PRIVACY'} />
              : '-'}
          </span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">종목</span>
          <span className="text-sm font-semibold">{data.ticker || '-'}</span>
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-sm text-muted-foreground">API Key</span>
          <span className="text-sm font-semibold">
            {data.apiKey ? `${data.apiKey.slice(0, 6)}...` : '-'}
          </span>
        </div>
      </div>

      {error && <p className="text-sm text-neg">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-40"
        >
          이전
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-60 transition-colors"
        >
          {loading ? '연결 중...' : '계좌 연결'}
        </button>
      </div>
    </div>
  )
}
