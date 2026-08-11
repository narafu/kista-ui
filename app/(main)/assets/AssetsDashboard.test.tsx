import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AssetsDashboard } from './AssetsDashboard'

vi.mock('@entities/asset', () => ({
  useAssetsQuery: () => ({ data: [] }),
  listAvailableMonths: () => [],
}))

vi.mock('@features/asset/save-asset', () => ({
  NewAssetButton: () => <button type="button">자산 등록</button>,
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

const WIDGET_TEST_IDS = ['asset-overview', 'asset-trend', 'asset-composition', 'asset-record-check', 'asset-record-list']

describe('AssetsDashboard', () => {
  it('기본 진입 시 투자 탭이 선택되고 기존 자산 위젯과 자산 등록 버튼을 보여준다', () => {
    render(<AssetsDashboard />)

    expect(screen.getByRole('button', { name: '투자' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '수입' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '지출' })).toHaveAttribute('aria-pressed', 'false')
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })

  it('수입 탭을 선택하면 준비 중 안내를 보여주고 투자 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<AssetsDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))

    expect(screen.getByText('수입 탭은 준비 중입니다')).toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })

  it('지출 탭을 선택하면 준비 중 안내를 보여주고 투자 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<AssetsDashboard />)

    await user.click(screen.getByRole('button', { name: '지출' }))

    expect(screen.getByText('지출 탭은 준비 중입니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })

  it('수입 탭에서 다시 투자 탭으로 돌아오면 위젯과 자산 등록 버튼이 복원된다', async () => {
    const user = userEvent.setup()
    render(<AssetsDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))
    await user.click(screen.getByRole('button', { name: '투자' }))

    expect(screen.queryByText('수입 탭은 준비 중입니다')).not.toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })
})
