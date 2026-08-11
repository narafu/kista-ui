import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetForm } from './AssetForm'
import type { Asset } from '@entities/asset'

const { createMutateMock, updateMutateMock, toastSuccessMock } = vi.hoisted(() => ({
  createMutateMock: vi.fn(),
  updateMutateMock: vi.fn(),
  toastSuccessMock: vi.fn(),
}))

vi.mock('@entities/asset', async () => {
  const actual = await vi.importActual<typeof import('@entities/asset')>('@entities/asset')
  return {
    ...actual,
    useCreateAssetMutation: () => ({ mutate: createMutateMock, isPending: false }),
    useUpdateAssetMutation: () => ({ mutate: updateMutateMock, isPending: false }),
  }
})

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock } }))

vi.mock('@entities/runtime-config', async () => {
  const actual = await vi.importActual<typeof import('@entities/runtime-config')>('@entities/runtime-config')
  return { ...actual, useRuntimeConfigQuery: () => ({ data: undefined }) }
})

const onSuccess = vi.fn()
const onCancel = vi.fn()

const existing: Asset = {
  id: 'asset-1',
  entryDate: '2026-08-01',
  category: 'INVESTMENT',
  subcategory: '일반계좌',
  institution: '미래에셋증권',
  assetClass: '미국주식',
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

  it('금액을 천단위 콤마로 표시하고 제출 시 숫자로 변환한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByLabelText('세부 카테고리'), '일반계좌')
    await user.type(screen.getByLabelText('자산군'), '미국주식')
    await user.type(screen.getByLabelText('금액 (원)'), '1234567')

    expect(screen.getByLabelText('금액 (원)')).toHaveValue('1,234,567')

    await user.click(screen.getAllByRole('button', { name: '등록' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1234567, subcategory: '일반계좌', assetClass: '미국주식' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('필수 항목(세부 카테고리·자산군·금액)이 비어있으면 제출 버튼이 비활성화된다', async () => {
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getAllByRole('button', { name: '등록' })[0]).toBeDisabled()
  })

  it('기준일을 비우면 다른 필드가 채워져 있어도 제출 버튼이 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByLabelText('세부 카테고리'), '일반계좌')
    await user.type(screen.getByLabelText('자산군'), '미국주식')
    await user.type(screen.getByLabelText('금액 (원)'), '1000')
    expect(screen.getAllByRole('button', { name: '등록' })[0]).not.toBeDisabled()

    await user.clear(screen.getByLabelText('기준일'))
    expect(screen.getAllByRole('button', { name: '등록' })[0]).toBeDisabled()
  })

  it('edit 모드에서는 초기값을 채우고 수정 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="edit" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getByLabelText('세부 카테고리')).toHaveValue('일반계좌')
    expect(screen.getByLabelText('금액 (원)')).toHaveValue('1,000,000')

    await user.click(screen.getAllByRole('button', { name: '수정' })[0])

    expect(updateMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ subcategory: '일반계좌', amount: 1_000_000, strategy: 'VR' }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(createMutateMock).not.toHaveBeenCalled()
  })

  it('duplicate 모드에서는 금액을 제외한 초기값을 채우고, 금액을 입력해야 등록(create) mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="duplicate" initial={existing} onSuccess={onSuccess} onCancel={onCancel} />)

    expect(screen.getByLabelText('세부 카테고리')).toHaveValue('일반계좌')
    expect(screen.getByLabelText('금액 (원)')).toHaveValue('')
    expect(screen.getAllByRole('button', { name: '복제 등록' })[0]).toBeDisabled()

    await user.type(screen.getByLabelText('금액 (원)'), '2000000')
    await user.click(screen.getAllByRole('button', { name: '복제 등록' })[0])

    expect(createMutateMock).toHaveBeenCalledWith(
      expect.objectContaining({ subcategory: '일반계좌', amount: 2_000_000 }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
    expect(updateMutateMock).not.toHaveBeenCalled()
  })

  it('투자 카테고리에서는 운용전략 입력을 보여준다', () => {
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)
    expect(screen.getByLabelText('운용전략 (선택)')).toBeInTheDocument()
  })

  it('운용전략 자유 입력은 다른 콤보 필드와 동일하게 영문도 그대로 허용한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    const strategyInput = screen.getByLabelText('운용전략 (선택)')
    await user.type(strategyInput, 'VR메모')

    expect(strategyInput).toHaveValue('VR메모')
  })

  it('제출 성공 시 성공 toast를 띄우고 onSuccess를 호출한다', async () => {
    const user = userEvent.setup()
    render(<AssetForm mode="create" onSuccess={onSuccess} onCancel={onCancel} />)

    await user.type(screen.getByLabelText('세부 카테고리'), '일반계좌')
    await user.type(screen.getByLabelText('자산군'), '미국주식')
    await user.type(screen.getByLabelText('금액 (원)'), '1000')
    await user.click(screen.getAllByRole('button', { name: '등록' })[0])

    const options = createMutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => void }
    options.onSuccess()

    expect(toastSuccessMock).toHaveBeenCalledWith('자산 기록이 등록되었습니다')
    expect(onSuccess).toHaveBeenCalled()
  })
})
