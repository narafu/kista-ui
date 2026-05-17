'use client'

import { useReducer } from 'react'
import { Stepper } from '@/components/common/Stepper'
import { ApiStep } from './steps/ApiStep'
import { AccountInfoStep } from './steps/AccountInfoStep'
import { StrategyStep } from './steps/StrategyStep'
import { ConfirmStep } from './steps/ConfirmStep'

export type StepData = {
  apiKey: string
  apiSecret: string
  accountNo: string
  kisAccountType: string
  nickname: string
  strategyType: 'INFINITE' | 'PRIVACY' | ''
  ticker: 'TQQQ' | 'SOXL' | 'USD' | ''
}

type State = { step: 1 | 2 | 3 | 4; data: StepData }
type Action =
  | { type: 'NEXT'; payload: Partial<StepData> }
  | { type: 'BACK' }

const initialState: State = {
  step: 1,
  data: {
    apiKey: '',
    apiSecret: '',
    accountNo: '',
    kisAccountType: '01',
    nickname: '',
    strategyType: '',
    ticker: '',
  },
}

function reducer(state: State, action: Action): State {
  if (action.type === 'BACK') {
    return { ...state, step: (Math.max(1, state.step - 1) as 1 | 2 | 3 | 4) }
  }
  const newData = { ...state.data, ...action.payload }
  return { step: (Math.min(4, state.step + 1) as 1 | 2 | 3 | 4), data: newData }
}

const STEPS = ['API 키', '계좌 정보', '전략 선택', '확인']

export function NewAccountStepper() {
  const [{ step, data }, dispatch] = useReducer(reducer, initialState)
  const next = (payload: Partial<StepData>) => dispatch({ type: 'NEXT', payload })
  const back = () => dispatch({ type: 'BACK' })

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-8">
        <Stepper steps={STEPS} current={step} />
      </div>
      {step === 1 && <ApiStep data={data} onNext={next} />}
      {step === 2 && <AccountInfoStep data={data} onNext={next} onBack={back} />}
      {step === 3 && <StrategyStep data={data} onNext={next} onBack={back} />}
      {step === 4 && <ConfirmStep data={data} onBack={back} />}
    </div>
  )
}
