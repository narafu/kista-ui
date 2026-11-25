'use client'

import { useReducer, useState } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ApiKeyExpiryField, isEstimatedExpiry, kstToday, useTestBrokerConnectionMutation } from '@entities/account'
import type { CredentialBroker } from '@entities/account'
import { useMeta } from '@entities/meta'
import type { StepData } from '../CreateAccountStepper'
import { ApiKeyField, ApiSecretField, ConnectionTest } from './ApiStepParts'

interface Props {
  data: StepData
  onNext: (payload: Partial<StepData>) => void
  onBack: () => void
}

const BROKER_CONFIG = {
  TOSS: {
    title: '토스증권 API 키 입력',
    desc: '토스증권 Open API 자격증명을 입력하세요.',
    keyLabel: 'Client ID',
    secretLabel: 'Client Secret',
    linkHref: 'https://www.tossinvest.com',
    linkLabel: '토스증권 API 키 발급',
    hint: '로그인 후 우측 하단 [설정 - Open API] 메뉴에서 API 키를 발급받을 수 있습니다.',
    minLen: 10,
  },
  MERITZ: {
    title: '메리츠증권 API 키 입력',
    desc: '메리츠증권 Open API 자격증명을 입력하세요.',
    keyLabel: 'App Key',
    secretLabel: 'App Secret',
    linkHref: 'https://openapi.imeritz.com',
    linkLabel: '메리츠증권 Open API 키 발급',
    hint: '메리츠증권 Open API 포털에 로그인한 뒤 API 키를 발급받을 수 있습니다.',
    minLen: 10,
  },
} as const

type State = { apiKey: string; apiSecret: string; showSecret: boolean; touchedKey: boolean; touchedSecret: boolean }
type Action =
  | { type: 'key'; value: string }
  | { type: 'secret'; value: string }
  | { type: 'toggleSecret' }
  | { type: 'touchKey' }
  | { type: 'touchSecret' }

function stepReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'key': return { ...state, apiKey: action.value }
    case 'secret': return { ...state, apiSecret: action.value }
    case 'toggleSecret': return { ...state, showSecret: !state.showSecret }
    case 'touchKey': return { ...state, touchedKey: true }
    case 'touchSecret': return { ...state, touchedSecret: true }
  }
}

export function ApiStep({ data, onNext, onBack }: Props) {
  const [{ apiKey, apiSecret, showSecret, touchedKey, touchedSecret }, dispatch] = useReducer(stepReducer, {
    apiKey: data.apiKey,
    apiSecret: data.apiSecret,
    showSecret: false,
    touchedKey: false,
    touchedSecret: false,
  })
  const testMutation = useTestBrokerConnectionMutation()
  const { findBroker } = useMeta()
  const [apiKeyExpiresOn, setApiKeyExpiresOn] = useState(data.apiKeyExpiresOn)

  // MOCK은 이 스텝을 렌더하지 않는다(CreateAccountStepper가 건너뜀)
  const broker = data.broker as CredentialBroker
  const config = BROKER_CONFIG[broker]
  const showExpiry = isEstimatedExpiry(findBroker(broker)?.apiKeyExpirySource)
  const keyValid = apiKey.length >= config.minLen
  const secretValid = apiSecret.length >= config.minLen
  const canTest = keyValid && secretValid
  // 모든 broker가 연결 테스트 통과 후 다음 활성화
  const canProceed = testMutation.isSuccess

  const showKeyError = touchedKey && apiKey.length > 0 && !keyValid
  const showSecretError = touchedSecret && apiSecret.length > 0 && !secretValid

  function handleFieldChange(type: 'key' | 'secret') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type, value: e.target.value })
      testMutation.reset()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.desc}</p>
        <a href={config.linkHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand-fg-soft underline-offset-4 hover:underline">
          {config.linkLabel} <ExternalLink className="size-3" />
        </a>
        <p className="text-sm text-muted-foreground mt-2">{config.hint}</p>
      </div>

      <div className="flex flex-col gap-4">
        <ApiKeyField
          label={config.keyLabel}
          value={apiKey}
          showError={showKeyError}
          onChange={handleFieldChange('key')}
          onBlur={() => dispatch({ type: 'touchKey' })}
        />
        <ApiSecretField
          label={config.secretLabel}
          value={apiSecret}
          showError={showSecretError}
          onChange={handleFieldChange('secret')}
          onBlur={() => dispatch({ type: 'touchSecret' })}
          showSecret={showSecret}
          onToggle={() => dispatch({ type: 'toggleSecret' })}
        />
      </div>

      {showExpiry && (
        <ApiKeyExpiryField id="api-key-expires-on" value={apiKeyExpiresOn} onChange={setApiKeyExpiresOn} hint="증권사에서 확인한 실제 만료일을 입력하세요. 비우면 오늘부터 1년으로 계산합니다" />
      )}

      {broker === 'MERITZ' && (
        <p className="rounded-sm border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          메리츠증권은 계좌번호를 받지 않고 App Key에 연결된 계좌 하나로 매매합니다. 계좌를 여러 개 등록하려면 계좌마다 App Key를 따로 발급받으세요.
        </p>
      )}

      <ConnectionTest
        keyLabel={config.keyLabel}
        secretLabel={config.secretLabel}
        disabled={!canTest || testMutation.isPending}
        isPending={testMutation.isPending}
        isSuccess={testMutation.isSuccess}
        isError={testMutation.isError}
        error={testMutation.error}
        onTest={() => testMutation.mutate({ appKey: apiKey, appSecret: apiSecret, broker })}
      />

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="form" className="flex-1" onClick={onBack}>
          이전
        </Button>
        <Button
          type="button"
          size="form"
          className="flex-1"
          disabled={!canProceed || (showExpiry && apiKeyExpiresOn !== '' && apiKeyExpiresOn < kstToday())}
          onClick={() => onNext({ apiKey, apiSecret, apiKeyExpiresOn: showExpiry ? apiKeyExpiresOn : '' })}
        >
          다음
        </Button>
      </div>
    </div>
  )
}
