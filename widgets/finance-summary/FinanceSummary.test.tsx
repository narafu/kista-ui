import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FinanceSummary } from './FinanceSummary'
import type { FinanceCategoryType, Period } from '@entities/finance'

const { useFlowSummaryQueryMock } = vi.hoisted(() => ({
  useFlowSummaryQueryMock: vi.fn(),
}))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return { ...actual, useFlowSummaryQuery: useFlowSummaryQueryMock }
})

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf }) }
})

// 서버 FlowSummaryResponse — 기간 규칙(전월·전년 동기간·월평균·남은 금액·수입 대비 비율)은 서버가 계산한다.
function mockSummary(overrides: Record<string, unknown> = {}) {
  useFlowSummaryQueryMock.mockReturnValue({
    data: {
      total: 30000,
      count: 1,
      previousTotal: null,
      previousYearTotal: null,
      yearlyAverage: 30000,
      remaining: null,
      incomeRatio: null,
      ...overrides,
    },
    isLoading: false,
    isError: false,
  })
}

function renderSummary({ type = 'EXPENSE', period = { month: '2026-08', mode: 'monthly' }, isLoading = false }: {
  type?: FinanceCategoryType
  period?: Period
  isLoading?: boolean
} = {}) {
  return render(
    <FinanceSummary type={type} isLoading={isLoading} period={period} onPeriodChange={() => {}} today="2026-08-23" />,
  )
}

describe('FinanceSummary 조회·상태', () => {
  beforeEach(() => {
    useFlowSummaryQueryMock.mockReset()
  })

  it('유형·기간으로 서버 요약을 조회하고, 부모가 기간을 확정하기 전엔 조회를 미룬다', () => {
    mockSummary()
    renderSummary({ isLoading: true })
    expect(useFlowSummaryQueryMock).toHaveBeenCalledWith('EXPENSE', { month: '2026-08', mode: 'monthly' }, { enabled: false })
    expect(screen.getByText('불러오는 중…')).toBeInTheDocument()
  })

  it('조회 실패 시 에러 섹션을 표시한다', () => {
    useFlowSummaryQueryMock.mockReturnValue({ data: undefined, isLoading: false, isError: true })
    renderSummary()
    expect(screen.getByText('요약을 불러오지 못했습니다.')).toBeInTheDocument()
  })

  it('기간 내 거래가 없으면 빈 상태 문구를 표시한다', () => {
    mockSummary({ total: 0, count: 0, yearlyAverage: 0 })
    renderSummary()
    expect(screen.getByText('표시할 거래내역이 없습니다.')).toBeInTheDocument()
  })
})

describe('FinanceSummary 기간 선택', () => {
  beforeEach(() => mockSummary())

  it('네이티브 month input 대신 연월 팝오버 트리거를 렌더한다 (데스크탑 사파리 type="month" 미지원 대응)', () => {
    renderSummary()
    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /기준 연월/ })).toHaveTextContent('2026년 8월')
  })

  it('연간 모드일 때 월 캘린더 대신 연도 선택 팝오버 트리거를 렌더한다', () => {
    renderSummary({ period: { month: '2026-08', mode: 'yearly' } })
    expect(screen.queryByRole('button', { name: /기준 연월/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /기준 연도/ })).toHaveTextContent('2026년')
  })
})

describe('FinanceSummary 비교 카드', () => {
  it('연간 모드에서 전년 동기간 합이 오면 합계 카드에 전년대비를 함께 보여준다', () => {
    mockSummary({ previousYearTotal: 10000 })
    renderSummary({ period: { month: '2026-08', mode: 'yearly' } })
    expect(screen.getByText(/전년대비/)).toBeInTheDocument()
  })

  it('수입 대비 비율(0~1)을 퍼센트로 보여준다', () => {
    mockSummary({ incomeRatio: 0.3 })
    renderSummary()
    expect(screen.getByText('수입 대비 비율')).toBeInTheDocument()
    expect(screen.getByText('30%')).toBeInTheDocument()
  })

  it('수입 대비 비율이 없으면(수입 탭·수입 0) 카드를 보여주지 않는다', () => {
    mockSummary({ incomeRatio: null })
    renderSummary()
    expect(screen.queryByText('수입 대비 비율')).not.toBeInTheDocument()
  })
})

describe('FinanceSummary 월평균 카드', () => {
  it('서버가 준 선택 연도 월평균을 보여준다', () => {
    mockSummary({ yearlyAverage: 37500 })
    renderSummary()
    expect(screen.getByText('올해 월평균')).toBeInTheDocument()
    expect(screen.getByText('37,500원')).toBeInTheDocument()
  })

  it('올해가 아닌 연도를 보면 "올해" 대신 그 연도로 부른다', () => {
    mockSummary()
    renderSummary({ period: { month: '2025-03', mode: 'monthly' } })
    expect(screen.getByText('2025년 월평균')).toBeInTheDocument()
    expect(screen.queryByText('올해 월평균')).not.toBeInTheDocument()
  })
})

describe('FinanceSummary 남은 금액 카드', () => {
  it('남은 금액이 없으면(수입 외 탭) 카드를 보여주지 않는다', () => {
    mockSummary({ remaining: null })
    renderSummary()
    expect(screen.queryByText('남은 금액')).not.toBeInTheDocument()
  })

  it('INCOME 탭은 남은 금액 카드를 올해 월평균 카드보다 앞에 배치한다', () => {
    mockSummary({ total: 100000, remaining: 70000 })
    renderSummary({ type: 'INCOME' })
    const labels = screen.getAllByText(/^(남은 금액|올해 월평균)$/).map((el) => el.textContent)
    expect(labels).toEqual(['남은 금액', '올해 월평균'])
  })
})
