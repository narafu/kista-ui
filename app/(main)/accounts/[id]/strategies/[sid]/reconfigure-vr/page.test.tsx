import { describe, expect, it, vi } from 'vitest'

import { mockApi } from '@testing/mockApi'
import ReconfigureVrPage from './page'

// 서버 요청 컨텍스트(쿠키)는 단위 테스트에 없어 next/headers만 대신한다 — 데이터는 mockApi가 받는다
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'server-token' }) }) }))

function render(actions: { allowedActions?: string[]; blockedActions?: Array<{ action: string; reasonCode: string }> }) {
  vi.stubEnv('TRADING_API_BASE_URL', 'http://api.test')
  mockApi({
    'GET /api/accounts/{accountId}/trading-cycles': [{ id: 'strategy-1', accountId: 'account-1', ticker: 'TQQQ', type: 'VR', status: 'ACTIVE', vr: {}, ...actions }],
  } as never)
  return ReconfigureVrPage({ params: Promise.resolve({ id: 'account-1', sid: 'strategy-1' }) })
}

describe('ReconfigureVrPage', () => {
  it('RESET_VR이 허용되면 재설정 화면을 그린다', async () => {
    await expect(render({ allowedActions: ['RESET_VR'] })).resolves.toBeTruthy()
  })

  it('RESET_VR이 막힌 전략은 전략 상세로 보낸다', async () => {
    await expect(render({ blockedActions: [{ action: 'RESET_VR', reasonCode: 'ARCHIVED' }] })).rejects.toMatchObject({
      digest: expect.stringContaining(';/accounts/account-1/strategies/strategy-1;'),
    })
  })
})
