import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BuyCompetitionNotice } from './BuyCompetitionNotice'
import type { BuyCompetitionSummary } from '@entities/order'

const baseCompetition: BuyCompetitionSummary = {
  sufficientBudget: false,
  availableDeposit: '1000',
  requiredForThisStrategy: '200',
  consumedByHigherPriority: '900',
  blockedByHigherPriority: [
    { strategyId: 'vr-1', type: 'VR', ticker: 'TQQQ', requiredBuyUsd: '900', priority: 0 },
  ],
  uncertainStrategyIds: [],
}

describe('BuyCompetitionNotice', () => {
  it('shows the deficit amount and blocking strategy count', () => {
    render(<BuyCompetitionNotice competition={baseCompetition} deficitUsd={142.5} variant="inline" />)

    expect(screen.getByText('예수금 부족')).toBeInTheDocument()
    expect(screen.getByText(/142\.50 부족/)).toBeInTheDocument()
    expect(screen.getByText(/우선순위 전략 1개가 먼저 배정/)).toBeInTheDocument()
    expect(screen.queryByText(/VR \(TQQQ\)/)).not.toBeInTheDocument()
  })

  it('expands to show the blocking strategy list on toggle click', async () => {
    const user = userEvent.setup()
    render(<BuyCompetitionNotice competition={baseCompetition} deficitUsd={142.5} variant="row" />)

    await user.click(screen.getByRole('button', { name: /자세히/ }))

    expect(screen.getByText(/VR \(TQQQ\) — \$900\.00/)).toBeInTheDocument()
  })

  it('does not render a toggle when there are no blocking strategies', () => {
    render(<BuyCompetitionNotice competition={{ ...baseCompetition, blockedByHigherPriority: [] }} deficitUsd={200} variant="inline" />)

    expect(screen.queryByRole('button', { name: /자세히/ })).not.toBeInTheDocument()
  })

  it('shows an uncertainty note when expanded and uncertainStrategyIds is non-empty', async () => {
    const user = userEvent.setup()
    render(
      <BuyCompetitionNotice
        competition={{ ...baseCompetition, uncertainStrategyIds: ['privacy-1'] }}
        deficitUsd={142.5}
        variant="inline"
      />,
    )

    await user.click(screen.getByRole('button', { name: /자세히/ }))

    expect(screen.getByText(/일부 전략은 계산 불가로 정확하지 않을 수 있습니다/)).toBeInTheDocument()
  })
})
