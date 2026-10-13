import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BacktestForm } from './BacktestForm'
import type { UseBacktestFormResult } from './model/useBacktestForm'

function makeForm(codes: string[]): UseBacktestFormResult {
  return {
    meta: { cycleSeedTypes: [], strategyTypes: codes.map((code) => ({ code, availableTickers: ['TQQQ', 'SOXL'] })) },
    type: 'INFINITE',
    setType: vi.fn(),
    ticker: 'TQQQ',
    availableTickers: ['TQQQ', 'SOXL'],
    isLoading: false,
    submitDisabledReason: null,
    errorMessage: null,
    vrSettings: undefined,
    divisionCountOptions: [20, 30, 40],
    vrRamp: {},
    rampDefaults: {},
  } as unknown as UseBacktestFormResult
}

describe('BacktestForm 전략 유형 선택', () => {
  it('DCA는 백테스트 미지원이라 전략 카드에서 제외한다', () => {
    render(<BacktestForm form={makeForm(['INFINITE', 'VR', 'DCA'])} />)

    expect(screen.getByText('INFINITE')).toBeInTheDocument()
    expect(screen.getByText('VR')).toBeInTheDocument()
    expect(screen.queryByText('DCA')).not.toBeInTheDocument()
  })
})
