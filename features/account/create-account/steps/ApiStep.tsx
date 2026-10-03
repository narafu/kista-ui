'use client'

import { useReducer } from 'react'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTestKisConnectionMutation } from '@entities/account'
import type { BrokerCode } from '@entities/account'
import type { StepData } from '../CreateAccountStepper'
import { ApiKeyField, ApiSecretField, ConnectionTest } from './ApiStepParts'

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
    needsTest: true,
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
    needsTest: true,
    hint: '로그인 후 우측 하단 [설정 - Open API] 메뉴에서 API 키를 발급받을 수 있습니다.',
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
  // KIS/TOSS 모두 훅을 호출해야 함 (조건부 훅 호출 금지)
  const testMutation = useTestKisConnectionMutation()

  // MOCK은 이 스텝을 렌더하지 않음(CreateAccountStepper에서 건너뜀) — KIS/TOSS만 도달
  const broker = (data.broker === 'TOSS' ? 'TOSS' : 'KIS') as Exclude<BrokerCode, 'MOCK'>
  const config = BROKER_CONFIG[broker]
  const keyValid = apiKey.length >= config.minLen
  const secretValid = apiSecret.length >= config.minLen
  const canTest = keyValid && secretValid
  // KIS: 연결 테스트 통과 후 다음 활성화 / TOSS: 입력값만 있으면 다음 활성화
  const canProceed = config.needsTest ? testMutation.isSuccess : canTest

  const showKeyError = touchedKey && apiKey.length > 0 && !keyValid
  const showSecretError = touchedSecret && apiSecret.length > 0 && !secretValid

  function handleFieldChange(type: 'key' | 'secret') {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      dispatch({ type, value: e.target.value })
      if (config.needsTest) testMutation.reset()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold mb-1">{config.title}</h2>
        <p className="text-sm text-muted-foreground">{config.desc}</p>
        <a href={config.linkHref} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand-fg-soft)] underline-offset-4 hover:underline">
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

      {config.needsTest && (
        <ConnectionTest
          keyLabel={config.keyLabel}
          secretLabel={config.secretLabel}
          disabled={!canTest || testMutation.isPending}
          isPending={testMutation.isPending}
          isSuccess={testMutation.isSuccess}
          isError={testMutation.isError}
          onTest={() => testMutation.mutate({ appKey: apiKey, appSecret: apiSecret, broker })}
        />
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" size="form" className="flex-1" onClick={onBack}>
          이전
        </Button>
        <Button
          type="button"
          size="form"
          className="flex-1"
          disabled={!canProceed}
          onClick={() => onNext({ apiKey, apiSecret })}
        >
          다음
        </Button>
      </div>
    </div>
  )
}
