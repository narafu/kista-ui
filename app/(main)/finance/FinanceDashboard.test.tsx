import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FinanceDashboard } from './FinanceDashboard'

vi.mock('@entities/finance', () => ({
  useAssetSnapshotsQuery: () => ({ data: [] }),
  listAvailableMonths: () => [],
  useFinanceTransactionsQuery: () => ({ data: [], isLoading: false, isError: false }),
  useFinanceCategoriesQuery: () => ({ data: [], isLoading: false }),
  useFinanceBudgetsQuery: () => ({ data: [] }),
  buildCategoryIndex: () => new Map(),
  windowRange: (month: string) => ({ from: `${month}-01`, to: `${month}-28` }),
  previousYearRange: (period: { month: string }) => ({ from: `${period.month}-01`, to: `${period.month}-28` }),
}))

vi.mock('@features/asset/save-asset', () => ({
  NewAssetButton: () => <button type="button">자산 등록</button>,
}))
vi.mock('@features/finance/save-transaction', () => ({
  NewTransactionButton: () => <button type="button">내역 등록</button>,
}))
vi.mock('@features/finance/manage-budgets', () => ({
  BudgetManagerDialog: () => <button type="button">예산 등록</button>,
}))

vi.mock('@widgets/asset-overview', () => ({
  AssetOverview: () => <div data-testid="asset-overview" />,
}))
vi.mock('@widgets/asset-trend', () => ({
  AssetTrend: () => <div data-testid="asset-trend" />,
}))
vi.mock('@widgets/asset-composition', () => ({
  AssetComposition: () => <div data-testid="asset-composition" />,
}))
vi.mock('@widgets/asset-record-check', () => ({
  AssetRecordCheck: () => <div data-testid="asset-record-check" />,
}))
vi.mock('@widgets/asset-record-list', () => ({
  AssetRecordList: () => <div data-testid="asset-record-list" />,
}))
vi.mock('@widgets/asset-settings/AssetSettingsPanel', () => ({
  AssetSettingsPanel: () => <div data-testid="asset-settings-panel" />,
}))
vi.mock('@widgets/finance-summary', () => ({
  FinanceSummary: () => <div data-testid="finance-summary" />,
}))
vi.mock('@widgets/finance-trend', () => ({
  FinanceTrend: () => <div data-testid="finance-trend" />,
}))
vi.mock('@widgets/finance-budget-progress', () => ({
  FinanceBudgetProgress: () => <div data-testid="finance-budget-progress" />,
}))
vi.mock('@widgets/finance-record-list', () => ({
  FinanceRecordList: () => <div data-testid="finance-record-list" />,
}))

const ASSET_WIDGET_TEST_IDS = ['asset-overview', 'asset-trend', 'asset-composition', 'asset-record-check', 'asset-record-list']
const FLOW_WIDGET_TEST_IDS = ['finance-summary', 'finance-trend', 'finance-record-list']

describe('FinanceDashboard', () => {
  it('기본 진입 시 자산 탭이 선택되고 기존 자산 위젯과 자산 등록 버튼을 보여준다', () => {
    render(<FinanceDashboard />)

    expect(screen.getByRole('button', { name: '자산' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '수입' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '소비' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '저축' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '설정' })).toHaveAttribute('aria-pressed', 'false')
    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })

  it('탭은 자산·수입·소비·저축·설정 순서로 배치된다', () => {
    render(<FinanceDashboard />)

    const group = screen.getByRole('group', { name: '자산 탭' })
    const labels = within(group).getAllByRole('button').map((el) => el.textContent)

    expect(labels).toEqual(['자산', '수입', '소비', '저축', '설정'])
  })

  it('수입 탭을 선택하면 요약·예산 대비·추이·내역 위젯과 예산등록·내역등록 버튼을 보여준다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))

    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByTestId('finance-budget-progress')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 등록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내역 등록' })).toBeInTheDocument()
  })

  it('소비 탭을 선택하면 요약·추이·예산 대비·내역 위젯과 내역 등록 버튼을 보여준다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '소비' }))

    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByTestId('finance-budget-progress')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 등록' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내역 등록' })).toBeInTheDocument()
  })

  it('저축 탭을 선택하면 요약·추이·예산 대비·내역 위젯과 내역 등록 버튼을 보여준다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '저축' }))

    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByTestId('finance-budget-progress')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 등록' })).toBeInTheDocument()
  })

  it('수입 탭에서 다시 자산 탭으로 돌아오면 자산 위젯과 자산 등록 버튼이 복원된다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))
    await user.click(screen.getByRole('button', { name: '자산' }))

    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })

  it('설정 탭을 선택하면 설정 패널을 보여주고 자산·수입소비저축 위젯과 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '설정' }))

    expect(screen.getByTestId('asset-settings-panel')).toBeInTheDocument()
    for (const testId of ASSET_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    for (const testId of FLOW_WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '내역 등록' })).not.toBeInTheDocument()
  })
})
