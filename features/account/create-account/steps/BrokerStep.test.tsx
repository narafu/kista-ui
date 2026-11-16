import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrokerStep } from './BrokerStep'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      brokers: [
        { code: 'TOSS', label: '토스증권' },
        { code: 'MOCK', label: '모의계좌' },
        { code: 'MERITZ', label: '메리츠증권' },
      ],
    },
  }),
}))

const useRuntimeConfigQueryMock = vi.fn()
vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => useRuntimeConfigQueryMock(),
}))

describe('BrokerStep runtime availability', () => {
  it('hides disabled brokers', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: { brokers: { MERITZ: { enabled: true }, TOSS: { enabled: false } } } })
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /메리츠증권/ })).toBeInTheDocument()
    expect(screen.queryByText('토스증권')).not.toBeInTheDocument()
  })

  it('renders the MOCK broker card when enabled', () => {
    useRuntimeConfigQueryMock.mockReturnValue({
      data: { brokers: { TOSS: { enabled: true }, MOCK: { enabled: true } } },
    })
    const onNext = vi.fn()
    render(<BrokerStep onNext={onNext} />)
    const mockCard = screen.getByRole('button', { name: /모의계좌/ })
    expect(mockCard).toBeInTheDocument()
    mockCard.click()
    expect(onNext).toHaveBeenCalledWith({ broker: 'MOCK' })
  })

  it('모의계좌는 meta 순서와 무관하게 맨 뒤에 둔다', () => {
    useRuntimeConfigQueryMock.mockReturnValue({
      data: { brokers: { TOSS: { enabled: true }, MOCK: { enabled: true }, MERITZ: { enabled: true } } },
    })
    render(<BrokerStep onNext={vi.fn()} />)
    const names = screen.getAllByRole('button').map((b) => b.textContent ?? '')
    expect(names.map((n) => n.match(/토스증권|메리츠증권|모의계좌/)?.[0])).toEqual(['토스증권', '메리츠증권', '모의계좌'])
  })

  it('증권사 선택지에 업비트·바이낸스가 없다', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: { brokers: { TOSS: { enabled: true }, MERITZ: { enabled: true }, MOCK: { enabled: true } } } })
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.queryByText(/업비트|바이낸스/)).not.toBeInTheDocument()
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
