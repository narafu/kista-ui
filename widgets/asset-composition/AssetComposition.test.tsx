import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssetCompositionInner from './AssetCompositionInner'
import type { AssetSnapshot } from '@entities/finance'

const { useAssetSnapshotsQueryMock } = vi.hoisted(() => ({
  useAssetSnapshotsQueryMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetSnapshotsQuery: useAssetSnapshotsQueryMock,
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: { assetClasses: [], markets: [] },
    labelOf: (_category: string, code: string) => code,
  }),
}))

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'
const SYSTEM_SAVINGS_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000401'
const SYSTEM_LOAN_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000404'

function snapshot(overrides: Partial<AssetSnapshot>): AssetSnapshot {
  return {
    id: 'a1',
    categoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    categoryName: '일반계좌',
    accountName: '미래에셋증권',
    entryDate: '2026-07-01',
    assetClass: 'EQUITY',
    market: 'GLOBAL',
    amount: 1_000_000,
    ...overrides,
  }
}

describe('AssetCompositionInner', () => {
  beforeEach(() => {
    useAssetSnapshotsQueryMock.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetCompositionInner />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetCompositionInner />)
    expect(screen.getByText('구성비 데이터를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('자산 기록이 없으면 두 차트 모두 빈 상태 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetCompositionInner />)
    expect(screen.getByText('카테고리별 구성비')).toBeInTheDocument()
    expect(screen.getByText('자산군별 구성비')).toBeInTheDocument()
    expect(screen.getAllByText('표시할 구성비 데이터가 없습니다')).toHaveLength(2)
  })

  it('카테고리 구성비는 L1 카테고리 4개를 항상 범례에 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'EQUITY' })],
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
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'EQUITY', amount: 1_000_000 }),
        snapshot({ rootCategoryId: SYSTEM_SAVINGS_CATEGORY_ID, assetClass: 'CASH', amount: 500_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('EQUITY')).toBeInTheDocument()
    expect(screen.getByText('CASH')).toBeInTheDocument()
    expect(screen.queryByText('COMMODITY')).not.toBeInTheDocument()
    expect(screen.queryByText('CRYPTO')).not.toBeInTheDocument()
  })

  it('대출 자산은 자산군 구성비 범례에서 제외된다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 200_000 }),
        snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'EQUITY', amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('EQUITY')).toBeInTheDocument()
    expect(screen.queryByText('CASH')).not.toBeInTheDocument()
  })
})
