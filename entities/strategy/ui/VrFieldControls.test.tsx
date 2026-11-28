import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EMPTY_VR_RAMP, type VrRampValues } from '../model/vrRamp'
import { VrRampFields } from './VrFieldControls'

const LABELS: Record<keyof VrRampValues, string> = {
  initialGradient: '초기 gradient(G)',
  gGraceWeeks: 'gradient 유예',
  gStepWeeks: 'gradient 단계주기',
  gMax: 'gradient 상한',
  initialPoolLimitRate: '초기 poolLimitRate',
  pGraceWeeks: 'poolLimitRate 유예',
  poolLimitFloor: 'poolLimitRate 하한',
  pStepWeeks: 'poolLimitRate 단계주기',
}

function renderFields(errors?: Partial<Record<keyof VrRampValues, string>>) {
  return render(
    <VrRampFields
      fields={EMPTY_VR_RAMP}
      setField={() => {}}
      disabled={false}
      rampDefaults={{ initialGradient: 10, gMax: 20, initialPoolLimitRate: 0.75, poolLimitFloor: 0.5 }}
      errors={errors}
    />,
  )
}

describe('VrRampFields', () => {
  it.each(Object.entries(LABELS))('%s 오류를 칸에 연결한다', (field, label) => {
    renderFields({ [field]: '오류 문구' })
    const input = screen.getByLabelText(label)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(/오류 문구/)
    expect(screen.getByRole('alert')).toHaveTextContent('오류 문구')
  })

  it('오류가 없으면 어느 칸도 invalid가 아니다', () => {
    const { container } = renderFields()
    expect(container.querySelector('[aria-invalid]')).toBeNull()
  })
})
