'use client'

import { useEffect, useReducer } from 'react'
import { Stepper } from '@shared/ui/stepper'
import type { BrokerCode } from '@entities/account'
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

export function CreateAccountStepper() {
  const [{ step, data }, dispatch] = useReducer(reducer, initialState)
  const { data: runtimeConfig } = useRuntimeConfigQuery()

  useEffect(() => {
    if (!data.broker || !runtimeConfig) return
    if (runtimeConfig.brokers[data.broker]?.enabled !== true) dispatch({ type: 'RESET' })
  }, [data.broker, runtimeConfig])
  const next = (payload: Partial<StepData>) => dispatch({ type: 'NEXT', payload })
  const back = () => dispatch({ type: 'BACK' })

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} />
      </div>
      {step === 1 && <BrokerStep onNext={next} />}
      {step === 2 && <ApiStep data={data} onNext={next} onBack={back} />}
      {step === 3 && <AccountInfoStep data={data} onNext={next} onBack={back} />}
      {step === 4 && <ConfirmStep data={data} onBack={back} />}
    </div>
  )
}
