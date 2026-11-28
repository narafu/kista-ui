import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetRecordCheck } from './AssetRecordCheck'
import type { MonthlyClosing } from '@entities/finance'

const { useAssetCheckQueryMock, useMonthlyClosingsQueryMock, scopeState } = vi.hoisted(() => ({
  useAssetCheckQueryMock: vi.fn(),
  useMonthlyClosingsQueryMock: vi.fn(),
  scopeState: { groupId: undefined as string | undefined, groupsLoading: false, groupsError: false },
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useAssetCheckQuery: useAssetCheckQueryMock,
    useMonthlyClosingsQuery: useMonthlyClosingsQueryMock,
    useFinanceGroupsQuery: () => ({
      data: scopeState.groupsError ? undefined : scopeState.groupId ? [{ id: scopeState.groupId }] : [],
      isLoading: scopeState.groupsLoading,
      isError: scopeState.groupsError,
    }),
    useMonthlyClosingScopeGroupId: () => scopeState.groupId,
  }
})

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf }) }
})

vi.mock('@features/asset/toggle-monthly-check', () => ({
  ToggleMonthlyCheckButton: ({ month, completed }: { month: string; completed: boolean }) => (
    <div data-testid="toggle-monthly-check">{month} / {completed ? '완료' : '미완료'}</div>
  ),
}))

const ALL_L1 = [
  'f1000000-0000-4000-8000-000000000403',
  'f1000000-0000-4000-8000-000000000401',
  'f1000000-0000-4000-8000-000000000404',
  'f1000000-0000-4000-8000-000000000402',
]

// 서버 점검 응답 — 기본은 전 카테고리 기록·전월 없음·단일 기준일.
function check(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      month: '2026-08',
      previousMonth: null,
      missingCategoryIds: [],
      missingAccounts: [],
      dateGroups: [{ date: '2026-08-01', count: 4 }],
      ...overrides,
    },
    isLoading: false,
    isError: false,
  }
}

function defaultClosingsMock(data: MonthlyClosing[] = []) {
  useMonthlyClosingsQueryMock.mockReturnValue({ data, isLoading: false, isError: false })
}

describe('AssetRecordCheck', () => {
  beforeEach(() => {
    useAssetCheckQueryMock.mockReset()
    useMonthlyClosingsQueryMock.mockReset()
    scopeState.groupId = undefined
    scopeState.groupsLoading = false
    scopeState.groupsError = false
  })

  it('선택한 월에 기록이 없어도 크래시 없이 렌더링된다', () => {
    useAssetCheckQueryMock.mockReturnValue(check({ missingCategoryIds: ALL_L1, dateGroups: [] }))
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('미기록 카테고리')).toBeInTheDocument()
  })

  it('둘 중 하나라도 로딩 중이면 로딩 문구를 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue({ data: undefined, isLoading: true, isError: false })
    useMonthlyClosingsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('월 전환 중(placeholder) 이전 달 점검 결과 대신 로딩을 보이고 완료 토글은 남긴다', () => {
    useAssetCheckQueryMock.mockReturnValue({ ...check({ missingCategoryIds: ALL_L1 }), isPlaceholderData: true })
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-09" />)

    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
    expect(screen.queryByText('미기록 카테고리')).not.toBeInTheDocument()
    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-09')
  })

  it('둘 중 하나라도 에러면 에러 섹션을 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: false })
    useMonthlyClosingsQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('기록 점검 정보를 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('이번 달 기록이 없는 카테고리를 한글 라벨로 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check({ missingCategoryIds: ALL_L1.slice(1) }))
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    // 투자는 기록됐으므로 나머지 세 카테고리(예적금, 대출, 부동산)가 미기록으로 표시된다
    expect(screen.getByText('예적금, 대출, 부동산')).toBeInTheDocument()
  })

  it('전월 데이터가 없으면(previousMonth null) 전월 대비 누락 계좌 섹션을 표시하지 않는다', () => {
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.queryByText('전월 대비 누락 계좌')).not.toBeInTheDocument()
  })

  it('계좌 미연결 누락 항목은 계좌 미지정으로 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check({
      previousMonth: '2026-07',
      missingAccounts: [{ accountName: null, categoryName: '전세보증금', assetClass: 'REAL_ESTATE' }],
    }))
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText(/^계좌 미지정 · 전세보증금 · /)).toBeInTheDocument()
  })

  it('전월 계좌가 이번 달에 없으면 누락 계좌로 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check({
      previousMonth: '2026-07',
      missingAccounts: [{ accountName: '미래에셋증권', categoryName: '일반계좌', assetClass: 'EQUITY' }],
    }))
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText('전월 대비 누락 계좌')).toBeInTheDocument()
    expect(screen.getByText('미래에셋증권 · 일반계좌 · 주식')).toBeInTheDocument()
  })

  it('이번 달 기록이 여러 날짜에 걸쳐 있으면 기준일 혼재 경고를 표시한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check({
      dateGroups: [{ date: '2026-08-01', count: 1 }, { date: '2026-08-15', count: 1 }],
    }))
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByText(/여러 날짜\(8\/1, 8\/15\)에 나뉘어 있습니다/)).toBeInTheDocument()
  })

  it('단일 날짜만 있으면 기준일 혼재 경고를 표시하지 않는다', () => {
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock()

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.queryByText('기준일 혼재 경고')).not.toBeInTheDocument()
  })

  it('해당 월의 완료 상태를 찾아 토글 버튼에 전달하고, 없으면 기본값 false를 사용한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock([{ month: '2026-08', completed: true }])

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-08 / 완료')
    expect(screen.getByText(/등록·수정·삭제가 잠겨/)).toBeInTheDocument()
  })

  it('해당 월 완료 레코드가 없으면 completed=false를 기본값으로 전달한다', () => {
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock([])

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-08 / 미완료')
  })

  it('그룹 소속이면 활성 그룹 쿠키가 없어도 그룹 마감 행으로 완료를 판정한다', () => {
    // 운영 회귀: 서버는 소속 그룹 행에 마감을 저장하는데 UI가 쿠키(없음) 기준으로 개인 행을 찾아 항상 미완료로 보였다.
    scopeState.groupId = 'g1'
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock([{ month: '2026-08', completed: true, groupId: 'g1' }])

    render(<AssetRecordCheck month="2026-08" />)

    expect(screen.getByTestId('toggle-monthly-check')).toHaveTextContent('2026-08 / 완료')
  })

  it('그룹 목록 로딩·에러 중엔 스코프를 확정할 수 없어 완료 상태를 그리지 않는다', () => {
    useAssetCheckQueryMock.mockReturnValue(check())
    defaultClosingsMock([])

    scopeState.groupsLoading = true
    const { unmount } = render(<AssetRecordCheck month="2026-08" />)
    expect(screen.queryByTestId('toggle-monthly-check')).not.toBeInTheDocument()
    unmount()

    scopeState.groupsLoading = false
    scopeState.groupsError = true
    render(<AssetRecordCheck month="2026-08" />)
    expect(screen.getByText('기록 점검 정보를 불러오지 못했습니다.')).toBeInTheDocument()
  })
})
