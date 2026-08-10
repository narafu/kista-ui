import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssetCompositionInner from './AssetCompositionInner'
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
    entryDate: '2026-07-01',
    category: 'INVESTMENT',
    subcategory: '일반계좌',
    institution: '미래에셋증권',
    assetClass: '미국주식',
    amount: 1_000_000,
    ...overrides,
  }
}

describe('AssetCompositionInner', () => {
  beforeEach(() => {
    useAssetsQueryMock.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetCompositionInner />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetCompositionInner />)
    expect(screen.getByText('구성비 데이터를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('자산 기록이 없으면 두 차트 모두 빈 상태 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetCompositionInner />)
    expect(screen.getByText('카테고리별 구성비')).toBeInTheDocument()
    expect(screen.getByText('자산군별 구성비')).toBeInTheDocument()
    expect(screen.getAllByText('표시할 구성비 데이터가 없습니다')).toHaveLength(2)
  })

  it('카테고리 구성비는 4개 카테고리를 항상 범례에 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [asset({ category: 'INVESTMENT', assetClass: '미국주식' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('예적금')).toBeInTheDocument()
    expect(screen.getByText('대출')).toBeInTheDocument()
    expect(screen.getByText('부동산')).toBeInTheDocument()
  })

  it('자산군 구성비는 실제로 금액이 있는 자산군만 범례에 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [
        asset({ category: 'INVESTMENT', assetClass: '미국주식', amount: 1_000_000 }),
        asset({ category: 'SAVINGS', assetClass: '원화', amount: 500_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('미국주식')).toBeInTheDocument()
    expect(screen.getByText('원화')).toBeInTheDocument()
    expect(screen.queryByText('금/은')).not.toBeInTheDocument()
    expect(screen.queryByText('크립토')).not.toBeInTheDocument()
  })

  it('대출 자산은 자산군 구성비 범례에서 제외된다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [
        asset({ category: 'LOAN', assetClass: '달러', amount: 200_000 }),
        asset({ category: 'INVESTMENT', assetClass: '미국주식', amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('미국주식')).toBeInTheDocument()
    expect(screen.queryByText('달러')).not.toBeInTheDocument()
  })
})
