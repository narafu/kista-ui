import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountManager } from './AccountManager'
import type { FinanceAccount } from '@entities/finance'

const { createMutateMock, updateMutateMock, deleteMutateMock } = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  deleteMutateMock: vi.fn(),
}))

const accounts: FinanceAccount[] = [
  { id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권', accountNo: '1234567890', memo: '주 계좌' },
  { id: 'acc-2', accountType: 'BANK', name: '국민은행' },
]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceAccountsQuery: () => ({ data: accounts }),
    useCreateFinanceAccountMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateFinanceAccountMutation: () => ({ mutate: updateMutateMock, isPending: false }),
    useDeleteFinanceAccountMutation: () => ({ mutate: deleteMutateMock, isPending: false }),
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      financeAccountTypes: [
        { code: 'SECURITIES', label: '증권사' },
        { code: 'BANK', label: '은행' },
        { code: 'INSURANCE', label: '보험' },
        { code: 'EXCHANGE', label: '거래소' },
      ],
    },
  }),
}))

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

describe('AccountManager', () => {
  beforeEach(() => {
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
    deleteMutateMock.mockClear()
  })

  it('계좌 목록을 유형·이름과 함께 렌더한다', () => {
    render(<AccountManager />)

    expect(screen.getByText('미래에셋증권')).toBeInTheDocument()
    expect(screen.getByText('증권사')).toBeInTheDocument()
    expect(screen.getByText('국민은행')).toBeInTheDocument()
    expect(screen.getByText('은행')).toBeInTheDocument()
  })

  it('계좌번호를 뒷자리만 남기고 마스킹해 보여준다', () => {
    render(<AccountManager />)

    expect(screen.getByText('••••7890')).toBeInTheDocument()
    expect(screen.queryByText('1234567890')).not.toBeInTheDocument()
  })

  it('삭제 버튼을 누르면 확인 다이얼로그가 뜬다', async () => {
    const user = userEvent.setup()
    render(<AccountManager />)

    await user.click(screen.getByRole('button', { name: '미래에셋증권 계좌 삭제' }))

    expect(screen.getByText('미래에셋증권 계좌를 삭제하시겠습니까?')).toBeInTheDocument()
    expect(screen.getByText('이 계좌를 사용한 자산 기록은 계좌 미지정 상태로 남습니다.')).toBeInTheDocument()
  })
})
