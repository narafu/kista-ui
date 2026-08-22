import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StrategySuggestionManager } from './StrategySuggestionManager'

const { mutateMock, meState } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  meState: { data: undefined as { strategySuggestions: string[] } | undefined },
}))

vi.mock('@entities/user', () => ({
  DEFAULT_STRATEGY_SUGGESTIONS: ['VR', 'INFINITE', 'PRIVACY', 'DCA'],
  useMeQuery: () => ({ data: meState.data }),
  useUpdateStrategySuggestionsMutation: () => ({ mutate: mutateMock, isPending: false }),
}))

describe('StrategySuggestionManager', () => {
  beforeEach(() => {
    mutateMock.mockReset()
    meState.data = { strategySuggestions: ['VR', 'INFINITE'] }
  })

  it('유저 정보 로딩 전에는 렌더링하지 않는다', () => {
    meState.data = undefined
    const { container } = render(<StrategySuggestionManager />)
    expect(container).toBeEmptyDOMElement()
  })

  it('새 운용전략을 추가하면 목록만 저장한다', async () => {
    const user = userEvent.setup()
    render(<StrategySuggestionManager />)

    await user.type(screen.getByLabelText('운용전략 추가'), 'DCA-PLUS')
    await user.click(screen.getByLabelText('운용전략 추가 확정'))

    expect(mutateMock).toHaveBeenCalledWith(['VR', 'INFINITE', 'DCA-PLUS'])
  })
})
