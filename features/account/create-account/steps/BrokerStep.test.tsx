import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { BrokerStep } from './BrokerStep'

const enabledMock = vi.fn<(code: string) => boolean>()
vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      brokers: [
        { code: 'TOSS', label: '토스증권' },
        { code: 'MOCK', label: '모의계좌' },
        { code: 'MERITZ', label: '메리츠증권' },
      ].map((b) => ({ ...b, enabled: enabledMock(b.code) })),
    },
  }),
}))

const enable = (...codes: string[]) => enabledMock.mockImplementation((code) => codes.includes(code))

describe('BrokerStep 증권사 활성 여부(meta.brokers[].enabled)', () => {
  it('hides disabled brokers', () => {
    enable('MERITZ')
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.getByRole('button', { name: /메리츠증권/ })).toBeInTheDocument()
    expect(screen.queryByText('토스증권')).not.toBeInTheDocument()
  })

  it('renders the MOCK broker card when enabled', () => {
    enable('TOSS', 'MOCK')
    const onNext = vi.fn()
    render(<BrokerStep onNext={onNext} />)
    const mockCard = screen.getByRole('button', { name: /모의계좌/ })
    expect(mockCard).toBeInTheDocument()
    mockCard.click()
    expect(onNext).toHaveBeenCalledWith({ broker: 'MOCK' })
  })

  it('모의계좌는 meta 순서와 무관하게 맨 뒤에 둔다', () => {
    enable('TOSS', 'MOCK', 'MERITZ')
    render(<BrokerStep onNext={vi.fn()} />)
    const names = screen.getAllByRole('button').map((b) => b.textContent ?? '')
    expect(names.map((n) => n.match(/토스증권|메리츠증권|모의계좌/)?.[0])).toEqual(['토스증권', '메리츠증권', '모의계좌'])
  })

  it('증권사 선택지에 업비트·바이낸스가 없다', () => {
    enable('TOSS', 'MERITZ', 'MOCK')
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.queryByText(/업비트|바이낸스/)).not.toBeInTheDocument()
  })

  it('등록 가능한 증권사가 없으면 안내만 보인다', () => {
    enable()
    render(<BrokerStep onNext={vi.fn()} />)
    expect(screen.getByText('현재 등록 가능한 증권사가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
