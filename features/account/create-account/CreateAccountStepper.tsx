'use client'

import { useEffect, useReducer } from 'react'
import { Stepper } from '@shared/ui/stepper'
import type { BrokerCode } from '@entities/account'
import { isMockBroker } from '@shared/lib/api-schema'
import { useRuntimeConfigQuery } from '@entities/runtime-config'
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
  },
}

function reducer(state: State, action: Action): State {
  if (action.type === 'RESET') return initialState
  if (action.type === 'BACK') {
    return { ...state, step: (Math.max(1, state.step - 1) as 1 | 2 | 3 | 4) }
  }
  const newData = { ...state.data, ...action.payload }
  return { step: (Math.min(4, state.step + 1) as 1 | 2 | 3 | 4), data: newData }
}

const STEPS = ['증권사', 'API 키', '계좌 정보', '확인']
const MOCK_STEPS = ['증권사', '계좌 별칭', '확인']

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
  const { data: runtimeConfig } = useRuntimeConfigQuery()
  const isMock = isMockBroker(data.broker)

  useEffect(() => {
    if (!data.broker || !runtimeConfig) return
    if (runtimeConfig.brokers[data.broker]?.enabled !== true) dispatch({ type: 'RESET' })
  }, [data.broker, runtimeConfig])
  const next = (payload: Partial<StepData>) => dispatch({ type: 'NEXT', payload })
  const back = () => dispatch({ type: 'BACK' })

  const flow = isMock ? MOCK_FLOW : DEFAULT_FLOW

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Stepper steps={isMock ? MOCK_STEPS : STEPS} current={step} />
      </div>
      {flow[step - 1]?.({ data, next, back })}
    </div>
  )
}
