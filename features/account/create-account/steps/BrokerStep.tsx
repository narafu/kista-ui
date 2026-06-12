'use client'

import { Building2, TrendingUp } from 'lucide-react'
import type { BrokerCode } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  onNext: (payload: Partial<StepData>) => void
}

const BROKERS: Array<{
  code: BrokerCode
  name: string
  description: string
  Icon: React.ComponentType<{ className?: string }>
}> = [
  {
    code: 'KIS',
    name: '한국투자증권',
    description: 'Open API App Key / App Secret 방식',
    Icon: Building2,
  },
  {
    code: 'TOSS',
    name: '토스증권',
    description: 'Client ID / Client Secret 방식',
    Icon: TrendingUp,
  },
]

export function BrokerStep({ onNext }: Props) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">증권사 선택</h2>
        <p className="text-sm text-muted-foreground">
          연결할 증권사를 선택하세요.
        </p>
      </div>
      <div className="flex flex-col gap-3">
        {BROKERS.map(({ code, name, description, Icon }) => (
          <button
            key={code}
            type="button"
            onClick={() => onNext({ broker: code })}
            className="flex items-center gap-4 w-full rounded-[var(--r-lg)] border border-border bg-card p-5 text-left hover:border-rose-300 hover:shadow-[var(--sh-rose)] transition-all"
          >
            <div className="size-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Icon className="size-5 text-rose-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
