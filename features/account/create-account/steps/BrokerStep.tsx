'use client'

import { Building2, FlaskConical, TrendingUp } from 'lucide-react'
import { useMeta } from '@entities/meta'
import type { BrokerCode } from '@entities/account'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  onNext: (payload: Partial<StepData>) => void
}

// 아이콘·설명 문구는 UI 전용 — 순서·라벨은 API(meta.brokers)에서 수신
const BROKER_UI: Record<string, { description: string; Icon: React.ComponentType<{ className?: string }> }> = {
  TOSS: { description: 'Client ID / Client Secret 방식', Icon: TrendingUp },
  KIS: { description: 'App Key / App Secret 방식', Icon: Building2 },
  MOCK: { description: '실제 자금 없이 매매를 체험합니다', Icon: FlaskConical },
}

export function BrokerStep({ onNext }: Props) {
  const { meta } = useMeta()
  const { data: runtimeConfig, isLoading, isError, refetch } = useRuntimeConfigQuery()
  const enabledBrokers = meta.brokers.filter(({ code }) =>
    runtimeConfig?.brokers[code as keyof typeof runtimeConfig.brokers]?.enabled === true)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">증권사 선택</h2>
        <p className="text-sm text-muted-foreground">연결할 증권사를 선택하세요.</p>
      </div>
      <div className="flex flex-col gap-3">
        {isLoading && (
          <p className="rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            등록 가능한 증권사를 확인하고 있습니다.
          </p>
        )}
        {isError && (
          <div className="rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            <p>증권사 설정을 불러오지 못했습니다.</p>
            <button type="button" onClick={() => refetch()} className="mt-2 font-bold text-foreground underline underline-offset-4">
              다시 시도
            </button>
          </div>
        )}
        {runtimeConfig && enabledBrokers.length === 0 && (
          <p className="rounded-[var(--r-sm)] border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            현재 등록 가능한 증권사가 없습니다.
          </p>
        )}
        {enabledBrokers.map(({ code, label }) => {
          const ui = BROKER_UI[code]
          if (!ui) return null
          const { description, Icon } = ui
          return (
            <button
              key={code}
              type="button"
              onClick={() => onNext({ broker: code as BrokerCode })}
              className="flex items-center gap-4 w-full rounded-[var(--r-lg)] border border-border bg-card p-5 text-left hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
            >
              <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                <Icon className="size-5 text-rose-600" />
              </div>
              <div>
                <p className="font-semibold text-sm">{label}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
