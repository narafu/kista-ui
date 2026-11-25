'use client'

import { useEffect, useReducer } from 'react'
import { Stepper } from '@shared/ui/stepper'
import type { BrokerCode } from '@entities/account'
import { useMeta } from '@entities/meta'
import { isKeyOnlyBroker, isMockBroker } from '@shared/lib/api-schema'
import { BrokerStep } from './steps/BrokerStep'
import { ApiStep } from './steps/ApiStep'
import { AccountInfoStep } from './steps/AccountInfoStep'
import { ConfirmStep } from './steps/ConfirmStep'

export type StepData = {
  broker: BrokerCode | ''
  apiKey: string
  apiSecret: string
  accountNo: string
  nickname: string
  apiKeyExpiresOn: string // 선택 — 만료일이 추정값인 broker에서만 입력받는다('' = 미입력)
}

type State = { step: 1 | 2 | 3 | 4; data: StepData }
type Action =
  | { type: 'NEXT'; payload: Partial<StepData> }
  | { type: 'BACK' }
  | { type: 'RESET' }

const initialState: State = {
  step: 1,
  data: {
    broker: '',
    apiKey: '',
    apiSecret: '',
    accountNo: '',
    nickname: '',
    apiKeyExpiresOn: '',
  },
}

function reducer(state: State, action: Action): State {
  if (action.type === 'RESET') return initialState
  if (action.type === 'BACK') {
    return { ...state, step: (Math.max(1, state.step - 1) as 1 | 2 | 3 | 4) }
  }
  // 브로커를 바꾸면 이전 브로커의 키·계좌번호·만료일을 비운다(뒤로 갔다가 다른 브로커를 고르는 경우)
  const brokerChanged = action.payload.broker !== undefined && action.payload.broker !== state.data.broker
  const base = brokerChanged ? { ...state.data, apiKey: '', apiSecret: '', accountNo: '', apiKeyExpiresOn: '' } : state.data
  const newData = { ...base, ...action.payload }
  return { step: (Math.min(4, state.step + 1) as 1 | 2 | 3 | 4), data: newData }
}

const STEPS = ['API 키', '계좌 정보', '확인']
const KEY_ONLY_STEPS = ['API 키', '계좌 별칭', '확인']
const MOCK_STEPS = ['계좌 별칭', '확인']

type StepContext = { data: StepData; next: (payload: Partial<StepData>) => void; back: () => void }
type StepRenderer = (ctx: StepContext) => React.ReactNode

// step 번호가 흐름마다 다른 컴포넌트를 의미하는 걸 막기 위해, 흐름별로 렌더러를 순서대로 나열한 배열 하나로 관리한다
const DEFAULT_FLOW: StepRenderer[] = [
  ({ next }) => <BrokerStep onNext={next} />,
  ({ data, next, back }) => <ApiStep data={data} onNext={next} onBack={back} />,
  ({ data, next, back }) => <AccountInfoStep data={data} onNext={next} onBack={back} />,
  ({ data, back }) => <ConfirmStep data={data} onBack={back} />,
]
const MOCK_FLOW: StepRenderer[] = [
  ({ next }) => <BrokerStep onNext={next} />,
  ({ data, next, back }) => <AccountInfoStep data={data} onNext={next} onBack={back} />,
  ({ data, back }) => <ConfirmStep data={data} onBack={back} />,
]

export function CreateAccountStepper() {
  const [{ step, data }, dispatch] = useReducer(reducer, initialState)
  const { findBroker } = useMeta()
  const isMock = isMockBroker(data.broker)
  // 진행 중 관리자 설정으로 꺼진 증권사(router.refresh로 meta가 갱신된 경우)는 처음 단계로 되돌린다
  const brokerDisabled = !!data.broker && findBroker(data.broker)?.enabled !== true

  useEffect(() => {
    if (brokerDisabled) dispatch({ type: 'RESET' })
  }, [brokerDisabled])
  const next = (payload: Partial<StepData>) => dispatch({ type: 'NEXT', payload })
  const back = () => dispatch({ type: 'BACK' })

  const flow = isMock ? MOCK_FLOW : DEFAULT_FLOW
  // 계좌번호가 없는 broker(메리츠)는 흐름은 같고 3번째 스텝이 별칭만 받는다
  const steps = ['증권사', ...(isMock ? MOCK_STEPS : isKeyOnlyBroker(data.broker) ? KEY_ONLY_STEPS : STEPS)]

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Stepper steps={steps} current={step} />
      </div>
      {flow[step - 1]?.({ data, next, back })}
    </div>
  )
}
