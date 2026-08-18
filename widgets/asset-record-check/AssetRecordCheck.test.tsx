import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetRecordCheck } from './AssetRecordCheck'
import type { AssetSnapshot, MonthlyClosing } from '@entities/finance'

const { useAssetSnapshotsQueryMock, useMonthlyClosingsQueryMock } = vi.hoisted(() => ({
  useAssetSnapshotsQueryMock: vi.fn(),
  useMonthlyClosingsQueryMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetSnapshotsQuery: useAssetSnapshotsQueryMock,
    useMonthlyClosingsQuery: useMonthlyClosingsQueryMock,
  }
})

vi.mock('@features/asset/toggle-monthly-check', () => ({
  ToggleMonthlyCheckButton: ({ month, completed }: { month: string; completed: boolean }) => (
    <div data-testid="toggle-monthly-check">{month} / {completed ? '완료' : '미완료'}</div>
  ),
}))

const SYSTEM_INVESTMENT_CATEGORY_ID = 'f1000000-0000-4000-8000-000000000403'

function snapshot(overrides: Partial<AssetSnapshot>): AssetSnapshot {
  return {
    id: 'a1',
    categoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID,
    categoryName: '일반계좌',
    accountName: '미래에셋증권',
    entryDate: '2026-08-01',
    assetClass: 'EQUITY',
    market: 'GLOBAL',
    amount: 1_000_000,
    ...overrides,
  }
}

function defaultClosingsMock(data: MonthlyClosing[] = []) {
  useMonthlyClosingsQueryMock.mockReturnValue({ data, isLoading: false, isError: false })
}

describe('AssetRecordCheck', () => {
  beforeEach(() => {
    useAssetSnapshotsQueryMock.mockReset()
    useMonthlyClosingsQueryMock.mockReset()
  })

  it('month가 null이면 크래시 없이 중립 상태를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [], isLoading: false, isError: false })
    defaultClosingsMock()

    render(<AssetRecordCheck month={null} />)

    expect(screen.getByText('확인할 자산 기록이 아직 없습니다.')).toBeInTheDocument()
  })

  it('둘 중 하나라도 로딩 중이면 로딩 문구를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    useMonthlyClosingsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('둘 중 하나라도 에러면 에러 섹션을 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    useMonthlyClosingsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('기록 점검 정보를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('이번 달 기록이 없는 카테고리를 한글 라벨로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ rootCategoryId: SYSTEM_INVESTMENT_CATEGORY_ID, entryDate: '2026-08-01' })],
      isLoading: false,
      isError: false,
    })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    // 투자는 기록됐으므로 나머지 세 카테고리(예적금, 대출, 부동산)가 미기록으로 표시된다
    expect(screen.getByText('예적금, 대출, 부동산')).toBeInTheDocument()
  })

  it('전월 데이터가 없으면(previousMonth null) 전월 대비 누락 계좌 섹션을 표시하지 않는다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ entryDate: '2026-08-01' })],
      isLoading: false,
      isError: false,
    })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.queryByText('전월 대비 누락 계좌')).not.toBeInTheDocument()
  })

  it('전월 계좌가 이번 달에 없으면 누락 계좌로 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 'a-prev', entryDate: '2026-07-01', accountName: '미래에셋증권', categoryName: '일반계좌', assetClass: 'EQUITY' }),
        snapshot({ id: 'a-curr', entryDate: '2026-08-01', accountName: '삼성증권', categoryName: '연금계좌', assetClass: 'EQUITY' }),
      ],
      isLoading: false,
      isError: false,
    })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('전월 대비 누락 계좌')).toBeInTheDocument()
    expect(screen.getByText('미래에셋증권 · 일반계좌 · EQUITY')).toBeInTheDocument()
  })

  it('이번 달 기록이 여러 날짜에 걸쳐 있으면 기준일 혼재 경고를 표시한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [
        snapshot({ id: 'a1', entryDate: '2026-08-01' }),
        snapshot({ id: 'a2', entryDate: '2026-08-15', categoryName: '연금계좌' }),
      ],
      isLoading: false,
      isError: false,
    })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText(/여러 날짜\(8\/1, 8\/15\)에 나뉘어 있습니다/)).toBeInTheDocument()
  })

  it('단일 날짜만 있으면 기준일 혼재 경고를 표시하지 않는다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({
      data: [snapshot({ entryDate: '2026-08-01' })],
      isLoading: false,
      isError: false,
    })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.queryByText('기준일 혼재 경고')).not.toBeInTheDocument()
  })

  it('해당 월의 완료 상태를 찾아 토글 버튼에 전달하고, 없으면 기본값 false를 사용한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({ entryDate: '2026-08-01' })], isLoading: false, isError: false })
    defaultClosingsMock([{ month: '2026-08', completed: true }])

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-08 / 완료')
  })

  it('해당 월 완료 레코드가 없으면 completed=false를 기본값으로 전달한다', () => {
    useAssetSnapshotsQueryMock.mockReturnValue({ data: [snapshot({ entryDate: '2026-08-01' })], isLoading: false, isError: false })
    defaultClosingsMock([])

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-08 / 미완료')
  })
})
