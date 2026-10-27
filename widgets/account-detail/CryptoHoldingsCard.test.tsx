import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'

const portfolio = {
  currency: 'KRW' as const,
  cash: 120000,
  totalAsset: 1478024,
  holdings: [
    { ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmount: 1358024 },
    { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmount: 0 },
  ],
}

const table = () => within(screen.getByRole('region', { name: '보유 종목 목록' }))

describe('CryptoHoldingsCard', () => {
  it('보유 종목의 수량·평단·현재가·평가금액을 원화로 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(table().getByText('0.01234567')).toBeInTheDocument()
    expect(table().getByText('110,000,000원')).toBeInTheDocument()
    expect(table().getByText('1,358,024원')).toBeInTheDocument()
  })

  it('현재가를 못 받은 종목은 확인 불가로 표시하고 0원을 보여주지 않는다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(table().getAllByText('현재가 확인 불가').length).toBeGreaterThan(0)
    expect(screen.queryByText('0원')).not.toBeInTheDocument()
  })

  it('바이낸스(USDT)는 USDT 단위로 보여주고 평단이 null이면 -를 보여준다', () => {
    render(
      <CryptoHoldingsCard
        portfolio={{
          currency: 'USDT',
          cash: 10,
          totalAsset: 75,
          holdings: [{ ticker: 'BTC', quantity: 0.001, avgBuyPrice: null, currentPrice: 65000.5, evalAmount: 65 }],
        }}
        isError={false}
      />,
    )
    expect(table().getByText('65,000.50 USDT')).toBeInTheDocument()
    expect(table().getByText('65.00 USDT')).toBeInTheDocument()
    expect(table().getByText('-')).toBeInTheDocument()
    expect(screen.queryByText(/원$/)).not.toBeInTheDocument()
  })

  it('보유 종목이 없으면 빈 상태 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={{ ...portfolio, holdings: [] }} isError={false} />)
    expect(screen.getByText('보유한 종목이 없습니다.')).toBeInTheDocument()
  })

  it('데이터 없이 실패하면 오류 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={undefined} isError />)
    expect(screen.getByText('보유 종목을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('모바일 카드에 종목·수량·평단가·현재가·평가금액을 보여준다', () => {
    const { container } = render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    const card = within(container.querySelector('.lg\\:hidden') as HTMLElement)
    expect(card.getByText('BTC')).toBeInTheDocument()
    expect(card.getByText('0.01234567')).toBeInTheDocument()
    expect(card.getByText('100,000,000원')).toBeInTheDocument()
    expect(card.getByText('110,000,000원')).toBeInTheDocument()
    expect(card.getByText('1,358,024원')).toBeInTheDocument()
    expect(card.getAllByText('확인 불가')).toHaveLength(2)
  })
})
