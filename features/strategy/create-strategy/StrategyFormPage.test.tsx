import { act, fireEvent, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import { describe, expect, it } from 'vitest'

import { strategyKeys, type Strategy } from '@entities/strategy'
import { createQueryClient } from '@shared/lib/query'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { StrategyFormPage } from './StrategyFormPage'

const initial: Strategy = {
  id: 'strategy-1',
  accountId: 'account-1',
  type: 'INFINITE',
  status: 'ACTIVE',
  ticker: 'TQQQ',
  cycleSeedType: 'MAX',
  initialDeposit: 1000,
  divisionCount: 20,
  isReverseMode: false,
  cycleInProgress: true,
  allowedActions: [],
  blockedActions: [],
  currentHoldings: 0,
}

// 폼이 시드 미리보기를 읽는다(전략 정책은 renderApp의 meta)
const formApi = {
  'GET /api/accounts/{accountId}/trading-cycles': [initial],
  'POST /api/trading-cycles/{id}/update-validations': { fieldErrors: [], warnings: [], derived: { minSeed: 100 } },
} as never

const SEED_LOCKED = '예수금은 전략 등록 후 수정할 수 없습니다'

describe('StrategyFormPage', () => {
  it('수정 폼에서 취소하면 상세 페이지로 이동한다', async () => {
    mockApi(formApi)
    renderApp(<StrategyFormPage accountId="account-1" initial={initial} />)
    fireEvent.click(await screen.findByRole('button', { name: '취소' }))
    expect(useRouter().push).toHaveBeenCalledWith('/accounts/account-1/strategies/strategy-1')
  })

  it('passes the live detail cache to the form so trade-driven holdings changes reach it without a refresh', async () => {
    mockApi(formApi)
    const queryClient = createQueryClient()
    queryClient.setQueryData(strategyKeys.detail(initial.id), initial)
    renderApp(<StrategyFormPage accountId="account-1" initial={initial} />, { queryClient })
    expect(screen.queryByText(SEED_LOCKED)).not.toBeInTheDocument()

    act(() => {
      queryClient.setQueryData(strategyKeys.detail(initial.id), { ...initial, currentHoldings: 3 })
    })

    expect(await screen.findByText(SEED_LOCKED)).toBeInTheDocument()
  })
})
