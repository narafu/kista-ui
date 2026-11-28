import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetOverview } from './AssetOverview'
import type { AssetMonthlySummary } from '@entities/finance'

const { useAssetSummaryQueryMock } = vi.hoisted(() => ({
  useAssetSummaryQueryMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetSummaryQuery: useAssetSummaryQueryMock,
  }
})

vi.mock('@entities/meta', async () => {
  const { testMeta, testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({
    meta: testMeta,
    labelOf: testLabelOf,
  }) }
})

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'
const SYSTEM_SAVINGS_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000401'
const SYSTEM_LOAN_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000404'
const SYSTEM_REAL_ESTATE_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000402'

// 서버 MonthlySummary — categoryBreakdown은 L1 4개를 0 포함 고정 순서로, assetClassBreakdown은 금액이 있는 자산군만 준다.
function monthSummary(
  month: string,
  { invest = 0, savings = 0, loan = 0, realEstate = 0, assetClasses = [] }: {
    invest?: number
    savings?: number
    loan?: number
    realEstate?: number
    assetClasses?: AssetMonthlySummary['assetClassBreakdown']
  },
): AssetMonthlySummary {
  const totalAssets = invest + savings + realEstate
  const largest = [...assetClasses].sort((a, b) => b.amount - a.amount)[0] ?? null
  return {
    month,
    netWorth: totalAssets - loan,
    totalAssets,
    totalLiabilities: loan,
    largestAssetClass: largest,
    recordCount: [invest, savings, loan, realEstate].filter((amount) => amount > 0).length,
    categoryBreakdown: [
      { categoryId: SYSTEM_INVESTMENT_CATEGORY_ID, amount: invest },
      { categoryId: SYSTEM_SAVINGS_CATEGORY_ID, amount: savings },
      { categoryId: SYSTEM_LOAN_CATEGORY_ID, amount: loan },
      { categoryId: SYSTEM_REAL_ESTATE_CATEGORY_ID, amount: realEstate },
    ],
    assetClassBreakdown: assetClasses,
  }
}

function mockSummary(current: AssetMonthlySummary | null, previous: AssetMonthlySummary | null = null) {
  useAssetSummaryQueryMock.mockReturnValue({
    data: { month: current?.month ?? null, availableMonths: [], current, previous },
    isLoading: false,
    isError: false,
  })
}

const onMonthChange = vi.fn()
const TODAY = '2026-08-15'
const noop = vi.fn()

describe('AssetOverview', () => {
  beforeEach(() => {
    onMonthChange.mockClear()
    useAssetSummaryQueryMock.mockReset()
  })

  it('summaryMonth로 서버 요약을 조회한다 — 사용자가 월을 안 골랐으면 월 없이(최근 기록 월) 페이지와 같은 키로', () => {
    mockSummary(monthSummary('2026-08', { invest: 1_000_000 }))
    const { unmount } = render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(useAssetSummaryQueryMock).toHaveBeenLastCalledWith('2026-08')
    unmount()

    render(<AssetOverview month="2026-08" summaryMonth={undefined} onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(useAssetSummaryQueryMock).toHaveBeenLastCalledWith(undefined)
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetSummaryQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetSummaryQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(screen.getByText('자산 요약을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('재조회가 실패해도 이미 받은 요약은 오류로 덮지 않는다', () => {
    useAssetSummaryQueryMock.mockReturnValue({
      data: { month: '2026-08', availableMonths: ['2026-08'], current: monthSummary('2026-08', { invest: 1_000_000 }), previous: null },
      isLoading: false,
      isError: true,
    })
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(screen.queryByText('자산 요약을 불러오지 못했습니다.')).not.toBeInTheDocument()
  })

  it('선택한 월에 기록이 없으면 크래시 없이 안내 문구를 표시한다(자유 선택이라 데이터 없는 달도 고를 수 있다)', () => {
    mockSummary(monthSummary('2026-01', {}))
    render(<AssetOverview month="2026-01" summaryMonth="2026-01" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(screen.getByText('표시할 자산 기록이 없습니다.')).toBeInTheDocument()
  })

  it('기록이 전혀 없어도(current null) 월 선택기와 안내 문구를 렌더링한다', () => {
    mockSummary(null)
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)
    expect(screen.getByRole('button', { name: /기준 연월/ })).toBeInTheDocument()
    expect(screen.getByText('표시할 자산 기록이 없습니다.')).toBeInTheDocument()
  })

  it('KPI 카드에 순자산·총자산·총부채·가장 큰 자산군을 포맷팅해 표시한다', () => {
    mockSummary(monthSummary('2026-08', {
      invest: 3_000_000,
      savings: 1_000_000,
      loan: 500_000,
      assetClasses: [{ assetClass: 'CASH', amount: 1_000_000 }, { assetClass: 'EQUITY', amount: 3_000_000 }],
    }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    expect(screen.getByText('3,500,000원')).toBeInTheDocument()
    expect(screen.getByText('4,000,000원')).toBeInTheDocument()
    // 총부채 (카테고리별 현황의 '대출' 행에도 같은 금액이 나타나므로 개수만 확인)
    expect(screen.getAllByText('500,000원').length).toBeGreaterThan(0)
    // 가장 큰 자산군 = 주식(EQUITY) — 자산군별 현황 행에도 같은 라벨이 나타난다
    expect(screen.getAllByText('주식').length).toBeGreaterThan(0)
  })

  it('카테고리별 현황은 데이터가 없는 카테고리를 포함해 4개 모두 한글 라벨로 표시한다', () => {
    mockSummary(monthSummary('2026-08', { invest: 1_000_000, assetClasses: [{ assetClass: 'EQUITY', amount: 1_000_000 }] }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('예적금')).toBeInTheDocument()
    expect(screen.getByText('대출')).toBeInTheDocument()
    expect(screen.getByText('부동산')).toBeInTheDocument()
  })

  it('전월 요약이 없으면 카테고리별 현황 각 행에 -를 표시한다', () => {
    mockSummary(monthSummary('2026-08', { invest: 3_000_000, savings: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    expect(screen.getAllByText('-').length).toBeGreaterThan(0)
  })

  it('전월 요약이 있으면 카테고리·자산군 행에 전월 대비 증감(부호 포함 금액)을 표시한다', () => {
    mockSummary(
      monthSummary('2026-08', { invest: 3_000_000, assetClasses: [{ assetClass: 'EQUITY', amount: 3_000_000 }] }),
      monthSummary('2026-07', { invest: 2_000_000, assetClasses: [{ assetClass: 'EQUITY', amount: 2_000_000 }] }),
    )
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    // 투자 카테고리·EQUITY 자산군 둘 다 +1,000,000원
    expect(screen.getAllByText('+1,000,000원').length).toBe(2)
  })

  it('대출은 지난달보다 늘면(음수 아닌 델타) 손실 색상으로 표시한다', () => {
    mockSummary(monthSummary('2026-08', { loan: 1_500_000 }), monthSummary('2026-07', { loan: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    const loanDelta = screen.getByText('+500,000원')
    expect(loanDelta).toHaveClass('text-neg')
    expect(loanDelta).not.toHaveClass('text-pos')
  })

  it('지난달과 금액이 같으면(델타 0) 증감을 이익 색상이 아닌 중립 색상으로 표시한다', () => {
    mockSummary(monthSummary('2026-08', { invest: 1_000_000 }), monthSummary('2026-07', { invest: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    const zeroDelta = screen.getAllByText('+0원')[0]
    expect(zeroDelta).toHaveClass('text-muted-foreground')
    expect(zeroDelta).not.toHaveClass('text-pos')
    for (const kpiDelta of screen.getAllByText(/^전월대비/)) {
      expect(kpiDelta).toHaveClass('text-muted-foreground')
    }
  })

  it('자산군별 현황에 기록이 없으면(대출만 있는 경우) 안내 문구를 표시한다', () => {
    mockSummary(monthSummary('2026-08', { loan: 500_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    expect(screen.getByText('선택한 달의 자산군 기록이 없습니다.')).toBeInTheDocument()
  })

  it('월 선택기 트리거에 현재 선택된 연도·월이 표시된다', () => {
    mockSummary(monthSummary('2026-08', { invest: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={noop} />)

    expect(screen.getByRole('button', { name: /기준 연월/ })).toHaveTextContent('2026년 8월')
  })

  it('선택된 카테고리 행은 aria-pressed로 표시한다', () => {
    mockSummary(monthSummary('2026-08', { invest: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} selectedCategoryId={SYSTEM_INVESTMENT_CATEGORY_ID} onCategorySelect={noop} />)

    expect(screen.getByRole('button', { name: /투자.*내역 보기/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: /예적금.*내역 보기/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('카테고리별 현황 행을 클릭하면 그 카테고리 id로 onCategorySelect를 호출한다', async () => {
    const onCategorySelect = vi.fn()
    mockSummary(monthSummary('2026-08', { invest: 1_000_000 }))
    render(<AssetOverview month="2026-08" summaryMonth="2026-08" onMonthChange={onMonthChange} today={TODAY} onCategorySelect={onCategorySelect} />)

    await userEvent.click(screen.getByRole('button', { name: /투자.*내역 보기/ }))

    expect(onCategorySelect).toHaveBeenCalledWith(SYSTEM_INVESTMENT_CATEGORY_ID)
  })
})
