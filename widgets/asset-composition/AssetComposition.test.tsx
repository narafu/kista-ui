import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AssetCompositionInner from './AssetCompositionInner'
import type { AssetCompositionColumn } from '@entities/finance'

const { useAssetCompositionQueryMock } = vi.hoisted(() => ({
  useAssetCompositionQueryMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetCompositionQuery: useAssetCompositionQueryMock,
  }
})

vi.mock('@entities/meta', () => ({
  useMeta: () => ({
    meta: { assetClasses: [], markets: [] },
    labelOf: (_category: string, code: string) => code,
  }),
}))

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'

// basis별 응답을 따로 준다 — 서버가 카테고리(대출 포함)·자산군(대출 제외) 구성비를 나눠 계산한다.
function mockColumns({ category = [], assetClass = [] }: { category?: AssetCompositionColumn[]; assetClass?: AssetCompositionColumn[] }) {
  useAssetCompositionQueryMock.mockImplementation((basis: string) => ({
    data: { columns: basis === 'CATEGORY' ? category : assetClass },
    isLoading: false,
    isError: false,
  }))
}

function column(entries: { item: string; amount: number }[]): AssetCompositionColumn {
  const total = entries.reduce((sum, entry) => sum + entry.amount, 0)
  return {
    month: '2026-07',
    total,
    entries: entries.map((entry) => ({ ...entry, percent: total ? Math.round((entry.amount / total) * 10000) / 100 : 0 })),
  }
}

describe('AssetCompositionInner', () => {
  beforeEach(() => {
    useAssetCompositionQueryMock.mockReset()
  })

  it('카테고리·자산군 basis로 기간·기준 월을 넘겨 조회한다', () => {
    mockColumns({})
    render(<AssetCompositionInner month="2026-07" range={24} />)
    expect(useAssetCompositionQueryMock).toHaveBeenCalledWith('CATEGORY', 24, '2026-07')
    expect(useAssetCompositionQueryMock).toHaveBeenCalledWith('ASSET_CLASS', 24, '2026-07')
  })

  it('로딩 중에는 스켈레톤을 표시한다', () => {
    useAssetCompositionQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetCompositionInner />)
    expect(screen.getByTestId('asset-composition-skeleton')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetCompositionQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetCompositionInner />)
    expect(screen.getByText('구성비 데이터를 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('자산 기록이 없으면 두 차트 모두 빈 상태 문구를 표시한다', () => {
    mockColumns({})
    render(<AssetCompositionInner />)
    expect(screen.getByText('카테고리별 구성비')).toBeInTheDocument()
    expect(screen.getByText('자산군별 구성비')).toBeInTheDocument()
    expect(screen.getAllByText('표시할 구성비 데이터가 없습니다.')).toHaveLength(2)
  })

  it('카테고리 구성비는 L1 카테고리 4개를 항상 범례에 표시한다', () => {
    mockColumns({ category: [column([{ item: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 }])] })
    render(<AssetCompositionInner />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('예적금')).toBeInTheDocument()
    expect(screen.getByText('대출')).toBeInTheDocument()
    expect(screen.getByText('부동산')).toBeInTheDocument()
  })

  it('자산군 구성비는 실제로 금액이 있는 자산군만 범례에 표시한다', () => {
    mockColumns({
      assetClass: [column([
        { item: 'CASH', amount: 500_000 },
        { item: 'EQUITY', amount: 1_000_000 },
        { item: 'COMMODITY', amount: 0 },
        { item: 'CRYPTO', amount: 0 },
      ])],
    })
    render(<AssetCompositionInner />)

    expect(screen.getByText('EQUITY')).toBeInTheDocument()
    expect(screen.getByText('CASH')).toBeInTheDocument()
    expect(screen.queryByText('COMMODITY')).not.toBeInTheDocument()
    expect(screen.queryByText('CRYPTO')).not.toBeInTheDocument()
  })
})
