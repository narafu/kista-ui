import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssetTrendInner from './AssetTrendInner'
import type { Asset } from '@entities/asset'

const { useAssetsQueryMock } = vi.hoisted(() => ({
  useAssetsQueryMock: vi.fn(),
}))

vi.mock('@entities/asset', async () => {
  const actual = await vi.importActual<typeof import('@entities/asset')>('@entities/asset')
  return {
    ...actual,
    useAssetsQuery: useAssetsQueryMock,
  }
})

function asset(overrides: Partial<Asset>): Asset {
  return {
    id: 'a1',
    entryDate: '2026-08-01',
    category: 'INVESTMENT',
    subcategory: '일반계좌',
    institution: '미래에셋증권',
    assetClass: '미국주식',
    amount: 1_000_000,
    ...overrides,
  }
}

describe('AssetTrendInner', () => {
  beforeEach(() => {
    useAssetsQueryMock.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetTrendInner />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetTrendInner />)
    expect(screen.getByText('자산 추이를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('기록이 없으면 표시할 추이 데이터가 없다는 문구를 보여준다', () => {
    useAssetsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetTrendInner />)
    expect(screen.getByText('표시할 추이 데이터가 없습니다')).toBeInTheDocument()
  })

  it('기록이 있으면 빈 상태 문구 대신 3개의 모드 버튼을 보여준다', () => {
    useAssetsQueryMock.mockReturnValue({ data: [asset({})], isLoading: false, isError: false })
    render(<AssetTrendInner />)

    expect(screen.queryByText('표시할 추이 데이터가 없습니다')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '순자산' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '카테고리별' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '자산군별' })).toBeInTheDocument()
  })

  it('기본 모드(순자산)는 활성 상태이고 보조 선택자를 표시하지 않는다', () => {
    useAssetsQueryMock.mockReturnValue({ data: [asset({})], isLoading: false, isError: false })
    render(<AssetTrendInner />)

    expect(screen.getByRole('button', { name: '순자산' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('카테고리별 모드를 선택하면 보조 카테고리 선택자가 나타난다', async () => {
    const user = userEvent.setup()
    useAssetsQueryMock.mockReturnValue({ data: [asset({})], isLoading: false, isError: false })
    render(<AssetTrendInner />)

    await user.click(screen.getByRole('button', { name: '카테고리별' }))

    expect(screen.getByRole('button', { name: '카테고리별' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: '카테고리' })).toBeInTheDocument()
  })

  it('자산군별 모드를 선택하면 보조 자산군 선택자가 나타난다', async () => {
    const user = userEvent.setup()
    useAssetsQueryMock.mockReturnValue({ data: [asset({})], isLoading: false, isError: false })
    render(<AssetTrendInner />)

    await user.click(screen.getByRole('button', { name: '자산군별' }))

    expect(screen.getByRole('button', { name: '자산군별' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: '자산군' })).toBeInTheDocument()
  })

  it('순자산 모드로 되돌아가면 보조 선택자가 다시 사라진다', async () => {
    const user = userEvent.setup()
    useAssetsQueryMock.mockReturnValue({ data: [asset({})], isLoading: false, isError: false })
    render(<AssetTrendInner />)

    await user.click(screen.getByRole('button', { name: '카테고리별' }))
    expect(screen.getByRole('combobox')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '순자산' }))
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })
})
