import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CryptoHoldingsCard } from './CryptoHoldingsCard'

const portfolio = {
  krwCash: 120000,
  totalAssetKrw: 1478024,
  holdings: [
    { ticker: 'BTC', quantity: 0.01234567, avgBuyPrice: 100000000, currentPrice: 110000000, evalAmountKrw: 1358024 },
    { ticker: 'ETH', quantity: 0.5, avgBuyPrice: 5000000, currentPrice: null, evalAmountKrw: 0 },
  ],
}

describe('CryptoHoldingsCard', () => {
  it('보유 코인의 수량·평단·현재가·평가금액을 원화로 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(screen.getByText('0.01234567')).toBeInTheDocument()
    expect(screen.getByText('110,000,000원')).toBeInTheDocument()
    expect(screen.getByText('1,358,024원')).toBeInTheDocument()
  })

  it('현재가를 못 받은 코인은 확인 불가로 표시하고 0원을 보여주지 않는다', () => {
    render(<CryptoHoldingsCard portfolio={portfolio} isError={false} />)
    expect(screen.getAllByText('현재가 확인 불가').length).toBeGreaterThan(0)
    expect(screen.queryByText('0원')).not.toBeInTheDocument()
  })

  it('보유 코인이 없으면 빈 상태 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={{ ...portfolio, holdings: [] }} isError={false} />)
    expect(screen.getByText('보유한 코인이 없습니다.')).toBeInTheDocument()
  })

  it('데이터 없이 실패하면 오류 문구를 보여준다', () => {
    render(<CryptoHoldingsCard portfolio={undefined} isError />)
    expect(screen.getByText('보유 코인을 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
