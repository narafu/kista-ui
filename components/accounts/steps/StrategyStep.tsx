'use client'

import { useState } from 'react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

export function StrategyStep({ data, onNext, onBack }: Props) {
  const [strategyType, setStrategyType] = useState<'INFINITE' | 'PRIVACY' | ''>(data.strategyType)
  const [ticker, setTicker] = useState<'TQQQ' | 'SOXL' | 'USD' | ''>(data.ticker)

  const valid = !!strategyType && (strategyType === 'PRIVACY' || !!ticker)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">전략 선택</h2>
        <p className="text-sm text-muted-foreground">운영할 매매 전략을 선택하세요.</p>
      </div>

      <div className="flex flex-col gap-3">
        {([
          { id: 'INFINITE' as const, name: '인피니트', desc: '무한매수법 — TQQQ/SOXL 분할매매' },
          { id: 'PRIVACY' as const,  name: '프라이버시', desc: 'SOXL 고정 분할매매 (전략 노출 최소화)' },
        ]).map(s => (
          <button
            key={s.id}
            onClick={() => {
              setStrategyType(s.id)
              if (s.id === 'PRIVACY') setTicker('SOXL')
            }}
            className={`w-full text-left p-4 rounded-[var(--r-lg)] border-2 transition-colors ${
              strategyType === s.id
                ? 'border-rose-500 bg-rose-50'
                : 'border-border bg-card hover:border-rose-300'
            }`}
          >
            <p className="font-semibold text-sm">{s.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
          </button>
        ))}
      </div>

      {strategyType === 'INFINITE' && (
        <div>
          <p className="text-sm font-semibold mb-2">종목 선택</p>
          <div className="flex gap-2">
            {(['TQQQ', 'SOXL'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTicker(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-colors ${
                  ticker === t
                    ? 'border-rose-500 bg-rose-50 text-rose-600'
                    : 'border-border text-muted-foreground hover:border-rose-300'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
          이전
        </button>
        <button
          disabled={!valid}
          onClick={() => onNext({
            strategyType,
            ticker: strategyType === 'PRIVACY' ? 'SOXL' : ticker,
          })}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
