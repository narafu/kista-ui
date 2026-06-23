'use client'

import { Building2, TrendingUp } from 'lucide-react'
import { useMeta } from '@entities/meta'
import type { BrokerCode } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  onNext: (payload: Partial<StepData>) => void
}

// 아이콘·설명 문구는 UI 전용 — 순서·라벨은 API(meta.brokers)에서 수신
const BROKER_UI: Record<string, { description: string; Icon: React.ComponentType<{ className?: string }> }> = {
  TOSS: { description: 'Client ID / Client Secret 방식', Icon: TrendingUp },
  KIS: { description: 'App Key / App Secret 방식', Icon: Building2 },
}

export function BrokerStep({ onNext }: Props) {
  const { meta } = useMeta()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">증권사 선택</h2>
        <p className="text-sm text-muted-foreground">연결할 증권사를 선택하세요.</p>
      </div>
      <div className="flex flex-col gap-3">
        {meta.brokers.map(({ code, label }) => {
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
