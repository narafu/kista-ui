import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrokerStep } from './BrokerStep'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ meta: { brokers: [{ code: 'KIS', label: '한국투자증권' }, { code: 'TOSS', label: '토스증권' }] } }),
}))

const useRuntimeConfigQueryMock = vi.fn()
vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => useRuntimeConfigQueryMock(),
}))

describe('BrokerStep runtime availability', () => {
  it('hides disabled brokers', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: { brokers: { KIS: { enabled: true }, TOSS: { enabled: false } } } })
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /한국투자증권/ })).toBeInTheDocument()
    expect(screen.queryByText('토스증권')).not.toBeInTheDocument()
  })

  it('shows an unavailable state while no broker can be safely selected', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined, isLoading: true })
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.getByText('등록 가능한 증권사를 확인하고 있습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows a retry action on runtime config failure', () => {
    const refetch = vi.fn()
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch })
    render(<BrokerStep onNext={vi.fn()} />)
    screen.getByRole('button', { name: '다시 시도' }).click()
    expect(refetch).toHaveBeenCalled()
  })
})
