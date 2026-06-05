'use client'

import { useReducer } from 'react'
import { Stepper } from '@widgets/stepper'
import { ApiStep } from './steps/ApiStep'
import { AccountInfoStep } from './steps/AccountInfoStep'
import { ConfirmStep } from './steps/ConfirmStep'

export type StepData = {
  apiKey: string
  apiSecret: string
  accountNo: string
  nickname: string
}

type State = { step: 1 | 2 | 3; data: StepData }
type Action =
  | { type: 'NEXT'; payload: Partial<StepData> }
  | { type: 'BACK' }

const initialState: State = {
  step: 1,
  data: {
    apiKey: '',
    apiSecret: '',
    accountNo: '',
    nickname: '',
  },
}

function reducer(state: State, action: Action): State {
  if (action.type === 'BACK') {
    return { ...state, step: (Math.max(1, state.step - 1) as 1 | 2 | 3) }
  }
  const newData = { ...state.data, ...action.payload }
  return { step: (Math.min(3, state.step + 1) as 1 | 2 | 3), data: newData }
}

const STEPS = ['API 키', '계좌 정보', '확인']

export function CreateAccountStepper() {
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
      {step === 3 && <ConfirmStep data={data} onBack={back} />}
    </div>
  )
}
