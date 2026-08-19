import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FinanceDashboard } from './FinanceDashboard'

vi.mock('@entities/finance', () => ({
  useAssetSnapshotsQuery: () => ({ data: [] }),
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
vi.mock('@widgets/asset-settings/AssetSettingsPanel', () => ({
  AssetSettingsPanel: () => <div data-testid="asset-settings-panel" />,
}))

const WIDGET_TEST_IDS = ['asset-overview', 'asset-trend', 'asset-composition', 'asset-record-check', 'asset-record-list']

describe('FinanceDashboard', () => {
  it('기본 진입 시 자산 탭이 선택되고 기존 자산 위젯과 자산 등록 버튼을 보여준다', () => {
    render(<FinanceDashboard />)

    expect(screen.getByRole('button', { name: '자산' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '수입' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '소비' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '저축' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '설정' })).toHaveAttribute('aria-pressed', 'false')
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })

  it('탭은 수입·소비·저축·자산·설정 순서로 배치된다', () => {
    render(<FinanceDashboard />)

    const group = screen.getByRole('group', { name: '자산 탭' })
    const labels = within(group).getAllByRole('button').map((el) => el.textContent)

    expect(labels).toEqual(['수입', '소비', '저축', '자산', '설정'])
  })

  it('수입 탭을 선택하면 준비 중 안내를 보여주고 자산 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))

    expect(screen.getByText('수입 탭은 준비 중입니다')).toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })

  it('소비 탭을 선택하면 준비 중 안내를 보여주고 자산 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '소비' }))

    expect(screen.getByText('소비 탭은 준비 중입니다')).toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })

  it('저축 탭을 선택하면 준비 중 안내를 보여주고 자산 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '저축' }))

    expect(screen.getByText('저축 탭은 준비 중입니다')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })

  it('수입 탭에서 다시 자산 탭으로 돌아오면 위젯과 자산 등록 버튼이 복원된다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '수입' }))
    await user.click(screen.getByRole('button', { name: '자산' }))

    expect(screen.queryByText('수입 탭은 준비 중입니다')).not.toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.getByTestId(testId)).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
  })

  it('설정 탭을 선택하면 준비 중 안내 대신 설정 패널을 보여주고 자산 위젯·자산 등록 버튼은 사라진다', async () => {
    const user = userEvent.setup()
    render(<FinanceDashboard />)

    await user.click(screen.getByRole('button', { name: '설정' }))

    expect(screen.getByTestId('asset-settings-panel')).toBeInTheDocument()
    expect(screen.queryByText('설정 탭은 준비 중입니다')).not.toBeInTheDocument()
    for (const testId of WIDGET_TEST_IDS) {
      expect(screen.queryByTestId(testId)).not.toBeInTheDocument()
    }
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
  })
})
