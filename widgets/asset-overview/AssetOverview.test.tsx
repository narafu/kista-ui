import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetOverview } from './AssetOverview'
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

const onMonthChange = vi.fn()

describe('AssetOverview', () => {
  beforeEach(() => {
    onMonthChange.mockClear()
  })

  it('로딩 중에는 로딩 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.getByText('자산 요약을 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('month가 null이면 크래시 없이 안내 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [asset({})],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month={null} months={['2026-08']} onMonthChange={onMonthChange} />)
    expect(screen.getByText('표시할 자산 기록이 없습니다.')).toBeInTheDocument()
  })

  it('months가 비어있으면 월 선택기를 렌더링하지 않는다', () => {
    useAssetsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    render(<AssetOverview month={null} months={[]} onMonthChange={onMonthChange} />)
    expect(screen.queryByRole('combobox', { name: '기준 월' })).not.toBeInTheDocument()
  })

  it('KPI 카드에 순자산·총자산·총부채·가장 큰 자산군을 포맷팅해 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [
        asset({ id: 'a1', category: 'INVESTMENT', assetClass: '미국주식', amount: 3_000_000 }),
        asset({ id: 'a2', category: 'SAVINGS', assetClass: '원화', amount: 1_000_000 }),
        asset({ id: 'a3', category: 'LOAN', assetClass: '원화', amount: 500_000 }),
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
    // 가장 큰 자산군 = 미국주식 (3,000,000) — 자산군별 현황 행에도 같은 라벨이 나타난다
    expect(screen.getAllByText('미국주식').length).toBeGreaterThan(0)
  })

  it('카테고리별 현황은 데이터가 없는 카테고리를 포함해 4개 모두 한글 라벨로 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [asset({ id: 'a1', category: 'INVESTMENT', amount: 1_000_000 })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    expect(screen.getByText('투자')).toBeInTheDocument()
    expect(screen.getByText('예적금')).toBeInTheDocument()
    expect(screen.getByText('대출')).toBeInTheDocument()
    expect(screen.getByText('부동산')).toBeInTheDocument()
  })

  it('카테고리별 현황 각 행에 금액과 함께 비율(%)을 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [
        asset({ id: 'a1', category: 'INVESTMENT', amount: 3_000_000 }),
        asset({ id: 'a2', category: 'SAVINGS', amount: 1_000_000 }),
      ],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    // 투자 3,000,000 / 총 4,000,000 = 75.0%, 예적금 1,000,000 / 4,000,000 = 25.0%
    expect(screen.getByText('75.0%')).toBeInTheDocument()
    expect(screen.getByText('25.0%')).toBeInTheDocument()
  })

  it('자산군별 현황에 기록이 없으면(대출만 있는 경우) 안내 문구를 표시한다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [asset({ id: 'a1', category: 'LOAN', assetClass: '원화', amount: 500_000 })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08']} onMonthChange={onMonthChange} />)

    expect(screen.getByText('이번 달 기록이 없습니다')).toBeInTheDocument()
  })

  it('월 선택기 트리거에 현재 선택된 월이 표시된다', () => {
    useAssetsQueryMock.mockReturnValue({
      data: [asset({ id: 'a1' })],
      isLoading: false,
      isError: false,
    })
    render(<AssetOverview month="2026-08" months={['2026-08', '2026-07']} onMonthChange={onMonthChange} />)

    const trigger = screen.getByRole('combobox', { name: '기준 월' })
    expect(trigger).toHaveTextContent('2026-08')
  })
})
