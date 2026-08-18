import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetOverview } from './AssetOverview'
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
    meta: {
      assetClasses: [{ code: 'EQUITY', label: '미국주식' }, { code: 'CASH', label: '원화' }],
      markets: [{ code: 'GLOBAL', label: '해외' }, { code: 'DOMESTIC', label: '국내' }],
    },
    labelOf: (_category: string, code: string) => ({ EQUITY: '미국주식', CASH: '원화' } as Record<string, string>)[code] ?? code,
  }),
}))

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'
const SYSTEM_LOAN_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000404'
const SYSTEM_SAVINGS_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000401'

function snapshot(overrides: Partial<AssetSnapshot>): AssetSnapshot {
  return {
    id: 's1',
    categoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    categoryName: '투자',
    accountName: '미래에셋증권',
    entryDate: '2026-08-01',
    assetClass: 'EQUITY',
    market: 'GLOBAL',
    amount: 1_000_000,
    ...overrides,
  }
}

const onMonthChange = vi.fn()

describe('AssetOverview', () => {
  beforeEach(() => {
    onMonthChange.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.getByText('자산 요약을 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('month가 null이면 크래시 없이 안내 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({})],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month={null} months={['2026-08']} onMonthChange={onMonthChange} />)
    expect(screen.getByText('표시할 자산 기록이 없습니다.')).toBeInTheDocument()
  })

  it('months가 비어있으면 월 선택기를 렌더링하지 않는다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.queryByRole('combobox', { name: '기준 월' })).not.toBeInTheDocument()
  })

  it('KPI 카드에 순자산·총자산·총부채·가장 큰 자산군을 포맷팅해 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 's1', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, assetClass: 'EQUITY', amount: 3_000_000 }),
        snapshot({ id: 's2', rootCategoryId: SYSTEM_SAVINGS_CATEGORY_ID, assetClass: 'CASH', amount: 1_000_000 }),
        snapshot({ id: 's3', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 500_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    // 순자산 = 4,000,000 - 500,000 = 3,500,000
    expect(screen.getByText('3,500,000원')).toBeInTheDocument()
    // 총자산 = 3,000,000 + 1,000,000
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
    // 총부채 (카테고리별 현황의 '대출' 행에도 같은 금액이 나타나므로 개수만 확인)
    expect(screen.getAllByText('500,000원').length).toBeGreaterThan(0)
    // 가장 큰 자산군 = 미국주식(EQUITY, 3,000,000) — 자산군별 현황 행에도 같은 라벨이 나타난다
    expect(screen.getAllByText('미국주식').length).toBeGreaterThan(0)
  })

  it('카테고리별 현황은 데이터가 없는 카테고리를 포함해 4개 모두 한글 라벨로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ id: 's1', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('예적금')).toBeInTheDocument()
    expect(screen.getByText('대출')).toBeInTheDocument()
    expect(screen.getByText('부동산')).toBeInTheDocument()
  })

  it('지난달 기록이 없으면 카테고리별 현황 각 행에 —를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 's1', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 3_000_000 }),
        snapshot({ id: 's2', rootCategoryId: SYSTEM_SAVINGS_CATEGORY_ID, amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('지난달 기록이 있으면 카테고리별 현황 각 행에 지난달 대비 증감(부호 포함 금액)을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 's1', entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 3_000_000 }),
        snapshot({ id: 's2', entryDate: '2026-07-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 2_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08', '2026-07']} onMonthChange={onMonthChange} />)

    // 투자 카테고리·EQUITY 자산군 둘 다 이번달 3,000,000 - 지난달 2,000,000 = +1,000,000원
    expect(screen.getAllByText('+1,000,000원').length).toBe(2)
  })

  it('대출은 지난달보다 늘면(음수 아닌 델타) 손실 색상으로, 줄면 이익 색상으로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 's1', entryDate: '2026-08-01', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 1_500_000 }),
        snapshot({ id: 's2', entryDate: '2026-07-01', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08', '2026-07']} onMonthChange={onMonthChange} />)

    // 대출 500,000원 증가 = 나쁜 신호 → 손실 색상(text-neg), 이익 색상(text-pos)이면 안 됨
    const loanDelta = screen.getByText('+500,000원')
    expect(loanDelta).toHaveClass('text-neg')
    expect(loanDelta).not.toHaveClass('text-pos')
  })

  it('지난달과 금액이 같으면(델타 0) 증감을 이익 색상이 아닌 중립 색상으로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 's1', entryDate: '2026-08-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 }),
        snapshot({ id: 's2', entryDate: '2026-07-01', rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08', '2026-07']} onMonthChange={onMonthChange} />)

    const zeroDelta = screen.getAllByText('+0원')[0]
    expect(zeroDelta).toHaveClass('text-muted-foreground')
    expect(zeroDelta).not.toHaveClass('text-pos')
  })

  it('자산군별 현황에 기록이 없으면(대출만 있는 경우) 안내 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ id: 's1', rootCategoryId: SYSTEM_LOAN_CATEGORY_ID, assetClass: 'CASH', amount: 500_000 })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    expect(screen.getByText('이번 달 기록이 없습니다')).toBeInTheDocument()
  })

  it('월 선택기 트리거에 현재 선택된 월이 표시된다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ id: 's1' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08', '2026-07']} onMonthChange={onMonthChange} />)

    const trigger = screen.getByRole('combobox', { name: '기준 월' })
    expect(trigger).toHaveTextContent('2026-08')
  })
})
