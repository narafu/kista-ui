import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetForm } from './AssetForm'
import type { AssetSnapshot, FinanceAccount, FinanceCategory } from '@entities/finance'

const { createMutateMock, updateMutateMock, toastSuccessMock } = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

const categories: FinanceCategory[] = [{
  id: 'cat-l1-invest',
  type: 'ASSET',
  name: '투자',
  sortOrder: 30,
  system: true,
  children: [{
    id: 'cat-l2-general',
    parentId: 'cat-l1-invest',
    groupId: 'group-1',
    type: 'ASSET',
    name: '일반계좌',
    sortOrder: 10,
    system: false,
    children: [],
  }],
}]

const accounts: FinanceAccount[] = [{ id: 'acc-1', accountType: 'SECURITIES', name: '미래에셋증권' }]

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useFinanceCategoriesQuery: () => ({ data: categories }),
    useFinanceAccountsQuery: () => ({ data: accounts }),
    useCreateAssetSnapshotMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateAssetSnapshotMutation: () => ({ mutate: updateMutateMock, isPending: false }),
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

vi.mock('@entities/runtime-config', async () => {
  const actual = await vi.importActual<typeof import('@entities/runtime-config')>('@entities/runtime-config')
  return { ...actual, useRuntimeConfigQuery: () => ({ data: undefined }) }
})

const onSuccess = vi.fn()
const onCancel = vi.fn()

const existing: AssetSnapshot = {
  id: 'snap-1',
  categoryId: 'cat-l2-general',
  rootCategoryId: 'cat-l1-invest',
  categoryName: '일반계좌',
  accountId: 'acc-1',
  accountName: '미래에셋증권',
  entryDate: '2026-08-01',
  assetClass: 'EQUITY',
  market: 'GLOBAL',
  strategy: 'VR',
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
        amount: 1_000_000,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(createMutateMock).not.toHaveBeenCalled()
  })

  it('기준일을 비우면 제출 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getAllByRole('button', { name: '수정' })[0]).not.toBeDisabled()

    await user.clear(screen.getByLabelText('기준일'))
    expect(screen.getAllByRole('button', { name: '수정' })[0]).toBeDisabled()
  })

  it('duplicate 모드에서는 금액을 제외한 초기값을 채우고, 금액을 입력해야 등록(create) mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="duplicate" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getByLabelText('금액 (원)')).toHaveValue('')
    expect(screen.getAllByRole('button', { name: '복제 등록' })[0]).toBeDisabled()

    await user.type(screen.getByLabelText('금액 (원)'), '2000000')
    await user.click(screen.getAllByRole('button', { name: '복제 등록' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: 'cat-l2-general', amount: 2_000_000 }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('운용전략 입력을 보여준다', () => {
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)
    expect(screen.getByLabelText('운용전략 (선택)')).toBeInTheDocument()
  })

  it('운용전략 자유 입력은 영문도 그대로 허용한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    const strategyInput = screen.getByLabelText('운용전략 (선택)')
    await user.type(strategyInput, 'VR메모')

    expect(strategyInput).toHaveValue('VR메모')
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
