import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { BulkRegisterForm } from './BulkRegisterForm'

const { mutateMock, pushMock, toastSuccessMock, toastWarningMock } = vi.hoisted(() => ({
  mutateMock: vi.fn(),
  pushMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastWarningMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: pushMock }) }))
vi.mock('sonner', () => ({ toast: { success: toastSuccessMock, warning: toastWarningMock, error: vi.fn() } }))
vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: (_category: string, code: string) => code }),
}))

// 대분류(월급, 하위 카테고리 있음) > 소분류(기본급, 리프) 2단 트리 — 대분류는 전체 토글을
// 갖고 소분류(리프)는 갖지 않는다는 규칙을 함께 검증하기 위해 일부러 중첩 구조로 둔다.
const incomeCategory = {
  id: 'cat-income-root', type: 'INCOME' as const, name: '월급', sortOrder: 0, system: false,
  children: [
    { id: 'cat-income', type: 'INCOME' as const, name: '기본급', sortOrder: 0, system: false, children: [] },
  ],
}

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceTransactionsQuery: () => ({
      data: [
        { id: 't1', categoryId: 'cat-income', memo: '8월급', amount: 3650000, transactionDate: '2026-07-25' },
        { id: 't2', categoryId: 'cat-income', memo: '용돈', amount: 100000, transactionDate: '2026-07-05' },
      ],
    }),
    useAssetSnapshotsQuery: () => ({ data: [] }),
    useFinanceCategoriesQuery: (type: string) => ({ data: type === 'INCOME' ? [incomeCategory] : [] }),
    useBulkRegisterFinanceMutation: () => ({ mutate: mutateMock, isPending: false }),
  }
})

describe('BulkRegisterForm', () => {
  it('행의 포함 토글을 끄면 확정 시 해당 항목이 요청에서 빠진다', async () => {
    const user = userEvent.setup()
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await user.click(await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' }))
    await user.click(screen.getAllByRole('button', { name: '이대로 확정하기' })[0])

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: [expect.objectContaining({ categoryId: 'cat-income', memo: '용돈', amount: 100000 })],
      }),
      expect.anything(),
    )
  })

  it('포함된 항목은 대상월 마지막 일자로 요청에 담긴다', async () => {
    const user = userEvent.setup()
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })
    await user.click(screen.getAllByRole('button', { name: '이대로 확정하기' })[0])

    expect(mutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        transactions: expect.arrayContaining([
          expect.objectContaining({ categoryId: 'cat-income', transactionDate: '2026-08-31', amount: 3650000 }),
        ]),
      }),
      expect.anything(),
    )
  })

  it('섹션 전체 토글을 끄면 하위 행이 모두 제외된다', async () => {
    const user = userEvent.setup()
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })
    await user.click(screen.getByRole('switch', { name: '수입 전체 포함' }))

    expect(screen.getByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '기본급 용돈 100,000원 포함' })).not.toBeChecked()
    for (const btn of screen.getAllByRole('button', { name: '이대로 확정하기' })) {
      expect(btn).toBeDisabled()
    }
  })

  it('대분류 전체 토글을 끄면 하위 행과 섹션 전체 토글도 함께 꺼진다', async () => {
    const user = userEvent.setup()
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })
    await user.click(screen.getByRole('switch', { name: '월급 전체 포함' }))

    expect(screen.getByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })).not.toBeChecked()
    expect(screen.getByRole('switch', { name: '수입 전체 포함' })).not.toBeChecked()
  })

  it('소분류(하위 카테고리 없는 최하단 노드)는 전체 토글을 두지 않는다', async () => {
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })

    expect(screen.queryByRole('switch', { name: '기본급 전체 포함' })).not.toBeInTheDocument()
  })

  it('일부 항목이 서버에서 실패하면 성공 대신 경고 토스트로 실패 건수를 알린다', async () => {
    const user = userEvent.setup()
    render(<BulkRegisterForm defaultSourceMonth="2026-07" defaultTargetMonth="2026-08" />)

    await screen.findByRole('switch', { name: '기본급 8월급 3,650,000원 포함' })
    await user.click(screen.getAllByRole('button', { name: '이대로 확정하기' })[0])

    const onSuccess = mutateMock.mock.calls[0][1].onSuccess
    onSuccess({ assetSuccessCount: 0, transactionSuccessCount: 1, failures: ['거래(용돈): 카테고리 없음'] })

    expect(toastWarningMock).toHaveBeenCalledWith(expect.stringContaining('1건 실패'))
    expect(toastSuccessMock).not.toHaveBeenCalled()
  })
})
