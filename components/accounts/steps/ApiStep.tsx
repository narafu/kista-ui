'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
}

export function ApiStep({ data, onNext }: Props) {
  const [apiKey, setApiKey] = useState(data.apiKey)
  const [apiSecret, setApiSecret] = useState(data.apiSecret)
  const [showSecret, setShowSecret] = useState(false)

  const valid = apiKey.length >= 10 && apiSecret.length >= 10

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">KIS API 키 입력</h2>
        <p className="text-sm text-muted-foreground">한국투자증권 Open API 자격증명을 입력하세요.</p>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">App Key</label>
          <input
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="발급받은 App Key"
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
          />
        </div>
        <div>
          <label className="text-sm font-semibold mb-1.5 block">App Secret</label>
          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={e => setApiSecret(e.target.value)}
              placeholder="발급받은 App Secret"
              className="w-full px-3 py-2.5 pr-10 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            <button
              type="button"
              onClick={() => setShowSecret(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
      </div>
      <button
        disabled={!valid}
        onClick={() => onNext({ apiKey, apiSecret })}
        className="w-full h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        다음
      </button>
    </div>
  )
}
