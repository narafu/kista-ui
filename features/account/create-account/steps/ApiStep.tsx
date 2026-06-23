'use client'

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react'
import { useTestKisConnectionMutation } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

const BROKER_CONFIG = {
  KIS: {
    title: 'KIS API 키 입력',
    desc: '한국투자증권 Open API 자격증명을 입력하세요.',
    keyLabel: 'App Key',
    secretLabel: 'App Secret',
    linkHref: 'https://securities.koreainvestment.com/main/customer/systemdown/RestAPIService.jsp',
    linkLabel: '한국투자증권(KIS) API 키 발급',
    needsTest: false,
    hint: '로그인 후 API 키를 발급받을 수 있습니다.',
    minLen: 10,
  },
  TOSS: {
    title: '토스증권 API 키 입력',
    desc: '토스증권 Open API 자격증명을 입력하세요.',
    keyLabel: 'Client ID',
    secretLabel: 'Client Secret',
    linkHref: 'https://www.tossinvest.com',
    linkLabel: '토스증권 API 키 발급',
    needsTest: false,
    hint: '로그인 후 우측 하단 [설정 - Open API] 메뉴에서 API 키를 발급받을 수 있습니다.',
    minLen: 10,
  },
} as const

export function ApiStep({ data, onNext, onBack }: Props) {
  const [apiKey, setApiKey] = useState(data.apiKey)
  const [apiSecret, setApiSecret] = useState(data.apiSecret)
  const [showSecret, setShowSecret] = useState(false)
  const [touchedKey, setTouchedKey] = useState(false)
  const [touchedSecret, setTouchedSecret] = useState(false)
  // KIS/TOSS 모두 훅을 호출해야 함 (조건부 훅 호출 금지)
  const testMutation = useTestKisConnectionMutation()

  const broker = (data.broker || 'KIS') as BrokerCode
  const config = BROKER_CONFIG[broker]
  const keyValid = apiKey.length >= config.minLen
  const secretValid = apiSecret.length >= config.minLen
  const canTest = keyValid && secretValid
  // KIS: 연결 테스트 통과 후 다음 활성화 / TOSS: 입력값만 있으면 다음 활성화
  const canProceed = config.needsTest ? testMutation.isSuccess : canTest

  const showKeyError = touchedKey && apiKey.length > 0 && !keyValid
  const showSecretError = touchedSecret && apiSecret.length > 0 && !secretValid

  function handleKeyChange(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      if (config.needsTest) testMutation.reset()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.desc}</p>
        <a href={config.linkHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-[var(--brand-fg-soft)] hover:opacity-75 transition-opacity">
          {config.linkLabel} <ExternalLink className="size-3" />
        </a>
        <p className="text-xs text-muted-foreground mt-2">{config.hint}</p>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="api-key" className="text-sm font-semibold mb-1.5 block">
            {config.keyLabel} <span className="text-destructive">*</span>
          </label>
          <input
            id="api-key"
            value={apiKey}
            onChange={handleKeyChange(setApiKey)}
            onBlur={() => setTouchedKey(true)}
            placeholder={`발급받은 ${config.keyLabel}`}
            aria-describedby={showKeyError ? 'api-key-error' : undefined}
            aria-invalid={showKeyError}
            className="w-full px-3 py-2.5 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {showKeyError && (
            <p id="api-key-error" className="text-xs text-destructive mt-1">
              유효한 {config.keyLabel}를 입력해주세요.
            </p>
          )}
        </div>
        <div>
          <label htmlFor="api-secret" className="text-sm font-semibold mb-1.5 block">
            {config.secretLabel} <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <input
              id="api-secret"
              type={showSecret ? 'text' : 'password'}
              value={apiSecret}
              onChange={handleKeyChange(setApiSecret)}
              onBlur={() => setTouchedSecret(true)}
              placeholder={`발급받은 ${config.secretLabel}`}
              aria-describedby={showSecretError ? 'api-secret-error' : undefined}
              aria-invalid={showSecretError}
              className="w-full px-3 py-2.5 pr-10 rounded-[var(--r-md)] border border-border bg-background text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="button"
              onClick={() => setShowSecret((s) => !s)}
              aria-label={showSecret ? '숨기기' : '보기'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            >
              {showSecret ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          {showSecretError && (
            <p id="api-secret-error" className="text-xs text-destructive mt-1">
              유효한 {config.secretLabel}를 입력해주세요.
            </p>
          )}
        </div>
      </div>

      {config.needsTest && (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={!canTest || testMutation.isPending}
            onClick={() => testMutation.mutate({ appKey: apiKey, appSecret: apiSecret })}
            className="w-full h-10 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" /> 연결 확인 중...
              </>
            ) : (
              '연결 테스트'
            )}
          </button>
          {testMutation.isSuccess && (
            <div className="flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="size-4" /> 연결 성공
            </div>
          )}
          {testMutation.isError && (
            <div className="flex items-center gap-1.5 text-sm text-neg">
              <XCircle className="size-4" />
              KIS API 인증에 실패했습니다. App Key 또는 App Secret을 확인하세요.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="flex-1 h-11 rounded-[var(--r-md)] border border-border text-sm font-semibold hover:bg-muted transition-colors">
          이전
        </button>
        <button
          type="button"
          disabled={!canProceed}
          onClick={() => onNext({ apiKey, apiSecret })}
          className="flex-1 h-11 rounded-[var(--r-md)] bg-rose-600 text-white font-semibold text-sm hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          다음
        </button>
      </div>
    </div>
  )
}
