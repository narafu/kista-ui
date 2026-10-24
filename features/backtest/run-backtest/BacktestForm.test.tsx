import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BacktestForm } from './BacktestForm'
import type { UseBacktestFormResult } from './model/useBacktestForm'
import type { MetaBundle } from '@entities/meta'

// testMeta.strategyTypes는 비어 있어 전략 유형 이름만 로컬로 둔다
const STRATEGY_TYPE_LABELS: Record<string, string> = { INFINITE: '무한매수법', VR: 'VR', DCA: '적립식' }
vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: (g: string, code: string) => (g === 'strategyTypes' ? STRATEGY_TYPE_LABELS[code] ?? code : testLabelOf(g as keyof MetaBundle, code)) }) }
})

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

    expect(screen.getByText('무한매수법')).toBeInTheDocument()
    expect(screen.getByText('VR')).toBeInTheDocument()
    expect(screen.queryByText('적립식')).not.toBeInTheDocument()
  })
})
