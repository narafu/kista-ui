import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MetaProvider } from '@entities/meta'
import { strategyTypeMeta, testMeta } from '@entities/meta/__fixtures__/testMeta'
import { mockApi } from '@testing/mockApi'
import { renderApp } from '@testing/renderApp'
import { DcaStrategyForm } from './DcaStrategyForm'

// 실제 검증 훅(디바운스)을 거친다 — DcaStrategyForm.test.tsx는 훅을 mock해 보내는 시점을 못 본다
const meta = { ...testMeta, strategyTypes: [strategyTypeMeta({ code: 'DCA', availableTickers: ['UPRO'], orderTypes: ['MOO', 'MOC'] })] }

describe('DcaStrategyForm 서버 검증', () => {
  it('첫 규칙을 추가한 직후에도 규칙이 빈 바디는 보내지 않는다', async () => {
    vi.spyOn(window.history, 'back').mockImplementation(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
    const { requests } = mockApi({
      'POST /api/accounts/{accountId}/trading-cycle-validations': { fieldErrors: [], warnings: [], derived: {} },
      'GET /api/accounts/{accountId}/strategy-seed-preview': { ticker: 'UPRO', availableCash: null },
    })
    renderApp(
      <MetaProvider meta={meta}>
        <DcaStrategyForm accountId="a1" availableTickers={['UPRO']} defaultTicker="UPRO" tickerCustomizable prices={null} />
      </MetaProvider>,
    )
    fireEvent.click(screen.getByRole('button', { name: '매수 규칙 추가' }))
    fireEvent.change(screen.getByLabelText('회차당 금액'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: '완료' }))

    const sentRules = () => requests.filter((r) => r.method === 'POST').map((r) => (r.body as { dca: { rules: unknown[] } }).dca.rules.length)
    await waitFor(() => expect(sentRules()).toContain(1), { timeout: 3000 })
    expect(sentRules()).not.toContain(0)
  })
})
