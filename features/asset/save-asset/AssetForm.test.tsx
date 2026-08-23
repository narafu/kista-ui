import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetForm } from './AssetForm'
import { SYSTEM_INVESTMENT_CATEGORY_ID } from '@entities/finance'
import type { AssetSnapshot, FinanceAccount, FinanceCategory } from '@entities/finance'

const { createMutateMock, updateMutateMock, toastSuccessMock } = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

const categories: FinanceCategory[] = [
  {
    id: 'cat-l1-savings',
    type: 'ASSET',
    name: '예적금',
    sortOrder: 10,
    system: true,
    children: [],
  },
  {
    id: SYSTEM_INVESTMENT_CATEGORY_ID,
    type: 'ASSET',
    name: '투자',
    sortOrder: 30,
    system: true,
    children: [{
      id: 'cat-l2-general',
      parentId: SYSTEM_INVESTMENT_CATEGORY_ID,
      groupId: 'group-1',
      type: 'ASSET',
      name: '일반계좌',
      sortOrder: 10,
      system: false,
      children: [],
    }],
  },
]

const accounts: FinanceAccount[] = [{ id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권', memo: '주거래' }]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceCategoriesQuery: () => ({ data: categories }),
    useFinanceAccountsQuery: () => ({ data: accounts }),
    useCreateAssetSnapshotMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateAssetSnapshotMutation: () => ({ mutate: updateMutateMock, isPending: false }),
    useCanShareToGroup: () => false,
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: {
      assetClasses: [{ code: 'CASH', label: '현금' }, { code: 'EQUITY', label: '주식' }],
      markets: [{ code: 'DOMESTIC', label: '국내' }, { code: 'GLOBAL', label: '해외' }],
    },
    labelOf: (_category: string, code: string) => code,
  }),
}))

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock } }))

vi.mock('@entities/user', async () => {
  const actual = await vi.importActual<typeof import('@entities/user')>('@entities/user')
  return { ...actual, useMeQuery: () => ({ data: undefined }) }
})

const onSuccess = vi.fn()
const onCancel = vi.fn()

const existing: AssetSnapshot = {
  id: 'snap-1',
  categoryId: 'cat-l2-general',
  rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
  categoryName: '일반계좌',
  accountId: 'acc-1',
  accountName: '미래에셋증권',
  entryDate: '2026-08-01',
  assetClass: 'EQUITY',
  market: 'GLOBAL',
  strategy: 'VR',
  memo: '해외ETF 적립',
  amount: 1_000_000,
}

describe('AssetForm', () => {
  beforeEach(() => {
    createMutateMock.mockClear()
    updateMutateMock.mockClear()
    toastSuccessMock.mockClear()
    onSuccess.mockClear()
    onCancel.mockClear()
  })

  it('금액을 천단위 콤마로 표시한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByLabelText('금액 (원)'), '1234567')

    expect(screen.getByLabelText('금액 (원)')).toHaveValue('1,234,567')
  })

  it('create 모드는 카테고리 미선택 상태로 시작해 제출 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByLabelText('금액 (원)'), '1000')

    // 기준일은 오늘 날짜로 기본 채워지지만 카테고리를 아직 선택하지 않았다
    expect(screen.getAllByRole('button', { name: '등록' })[0]).toBeDisabled()
  })

  it('edit 모드에서는 초기값을 채우고 수정 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getByLabelText('기준일')).toHaveValue('2026-08-01')
    expect(screen.getByLabelText('금액 (원)')).toHaveValue('1,000,000')

    await user.click(screen.getAllByRole('button', { name: '수정' })[0])

    expect(updateMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: 'cat-l2-general',
        accountId: 'acc-1',
        assetClass: 'EQUITY',
        market: 'GLOBAL',
        strategy: 'VR',
        memo: '해외ETF 적립',
        amount: 1_000_000,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(createMutateMock).not.toHaveBeenCalled()
  })

  it('메모 입력 필드는 카테고리 선택 여부와 무관하게 항상 노출된다', () => {
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)
    expect(screen.getByLabelText('메모 (선택)')).toBeInTheDocument()
  })

  it('edit 모드에서는 메모 초기값을 채우고, 값을 바꾸면 수정 mutation payload에 반영한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    const memoInput = screen.getByLabelText('메모 (선택)')
    expect(memoInput).toHaveValue('해외ETF 적립')

    await user.clear(memoInput)
    await user.type(memoInput, '변경된 메모')
    await user.click(screen.getAllByRole('button', { name: '수정' })[0])

    expect(updateMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ memo: '변경된 메모' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('계좌에 메모가 있으면 계좌 Select 옵션 라벨에 이어붙여 표시한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole('combobox', { name: '계좌 (선택)' }))

    expect(await screen.findByRole('option', { name: '미래에셋증권 · 주거래' })).toBeInTheDocument()
  })

  it('기준일을 비우면 제출 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getAllByRole('button', { name: '수정' })[0]).not.toBeDisabled()

    await user.clear(screen.getByLabelText('기준일'))
    expect(screen.getAllByRole('button', { name: '수정' })[0]).toBeDisabled()
  })

  it('duplicate 모드에서는 금액을 포함한 초기값을 그대로 채우고, 등록(create) mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="duplicate" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getByLabelText('금액 (원)')).toHaveValue('1,000,000')
    expect(screen.getAllByRole('button', { name: '복제 등록' })[0]).not.toBeDisabled()

    await user.click(screen.getAllByRole('button', { name: '복제 등록' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-l2-general', amount: 1_000_000 }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('카테고리 미선택 상태에서는 운용전략 입력을 숨긴다', () => {
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)
    expect(screen.queryByLabelText('운용전략 (선택)')).not.toBeInTheDocument()
  })

  it('투자 카테고리를 선택하면 운용전략 입력을 보여준다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '투자' }))

    expect(screen.getByLabelText('운용전략 (선택)')).toBeInTheDocument()
  })

  it('운용전략 자유 입력은 영문도 그대로 허용한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '투자' }))

    const strategyInput = screen.getByLabelText('운용전략 (선택)')
    await user.type(strategyInput, 'VR메모')

    expect(strategyInput).toHaveValue('VR메모')
  })

  it('투자 카테고리 선택 후 다른 카테고리로 바꾸면 운용전략 입력이 사라지고 값도 리셋된다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getByRole('combobox', { name: '카테고리' }))
    await user.click(await screen.findByRole('option', { name: '투자' }))
    await user.type(screen.getByLabelText('운용전략 (선택)'), 'VR메모')

    await user.click(screen.getAllByRole('combobox', { name: '카테고리' })[0])
    await user.click(await screen.findByRole('option', { name: '예적금' }))

    expect(screen.queryByLabelText('운용전략 (선택)')).not.toBeInTheDocument()

    // 다시 투자로 되돌리면 리셋된 빈 값으로 재노출된다(이전 입력이 실수로 남아있지 않음)
    await user.click(screen.getAllByRole('combobox', { name: '카테고리' })[0])
    await user.click(await screen.findByRole('option', { name: '투자' }))
    expect(screen.getByLabelText('운용전략 (선택)')).toHaveValue('')
  })

  it('제출 성공 시 성공 toast를 띄우고 onSuccess를 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    await user.click(screen.getAllByRole('button', { name: '수정' })[0])

    const options = updateMutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => void }
    options.onSuccess()

    expect(toastSuccessMock).toHaveBeenCalledWith('자산 기록이 수정되었습니다')
    expect(onSuccess).toHaveBeenCalled()
  })
})
