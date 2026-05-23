'use client'

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import type { StepData } from '../NewAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
}

type TestStatus = null | 'testing' | 'ok' | 'fail'

export function ApiStep({ data, onNext }: Props) {
  const [apiKey, setApiKey] = useState(data.apiKey)
  const [apiSecret, setApiSecret] = useState(data.apiSecret)
  const [showSecret, setShowSecret] = useState(false)
  const [testStatus, setTestStatus] = useState<TestStatus>(null)
  const [testMessage, setTestMessage] = useState('')

  const canTest = apiKey.length >= 10 && apiSecret.length >= 10

  // 키 변경 시 테스트 결과 초기화
  function handleKeyChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      setTestStatus(null)
    }
  }

  async function handleTest() {
    setTestStatus('testing')
    setTestMessage('')
    try {
      const res = await fetch('/api/accounts/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appKey: apiKey, appSecret: apiSecret }),
      })
      const json = await res.json()
      if (json.success) {
        setTestStatus('ok')
      } else {
        setTestStatus('fail')
        setTestMessage(json.message ?? 'KIS API 연결에 실패했습니다.')
      }
    } catch {
      setTestStatus('fail')
      setTestMessage('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">KIS API 키 입력</h2>
        <p className="text-sm text-muted-foreground">한국투자증권 Open API 자격증명을 입력하세요.</p>
        <a
          href="https://securities.koreainvestment.com/main/customer/systemdown/RestAPIService.jsp"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-rose-500 hover:text-rose-600 transition-colors"
        >
          KIS API 키 발급받기 <ExternalLink className="size-3" />
        </a>
      </div>
      <div className="flex flex-col gap-4">
        <div>
          <label className="text-sm font-semibold mb-1.5 block">App Key</label>
          <input
            value={apiKey}
            onChange={handleKeyChange(setApiKey)}
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
              onChange={handleKeyChange(setApiSecret)}
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

      {/* 연결 테스트 */}
      <div className="flex flex-col gap-2">
        <button
          disabled={!canTest || testStatus === 'testing'}
          onClick={handleTest}
          className="w-full h-10 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {testStatus === 'testing' ? (
            <><Loader2 className="size-4 animate-spin" /> 연결 확인 중...</>
          ) : (
            '연결 테스트'
          )}
        </button>
        {testStatus === 'ok' && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-emerald-600">
            <CheckCircle2 className="size-4" /> 연결 성공
          </div>
        )}
        {testStatus === 'fail' && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-neg">
            <XCircle className="size-4" /> {testMessage}
          </div>
        )}
      </div>

      {/* 연결 테스트 성공 후에만 다음 활성화 */}
      <button
        disabled={testStatus !== 'ok'}
        onClick={() => onNext({ apiKey, apiSecret })}
        className="w-full h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        다음
      </button>
    </div>
  )
}
