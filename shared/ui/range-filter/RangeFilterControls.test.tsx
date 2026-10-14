import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RangeFilterControls } from './RangeFilterControls'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}))

function setup(overrides: Partial<React.ComponentProps<typeof RangeFilterControls>> = {}) {
  const props = {
    rangeType: '7d' as const,
    onRangeChange: vi.fn(),
    pageSize: '10',
    onPageSizeChange: vi.fn(),
    customFrom: '',
    customTo: '',
    onCustomFromChange: vi.fn(),
    onCustomToChange: vi.fn(),
    ...overrides,
  }
  render(<RangeFilterControls {...props} />)
  return props
}

describe('RangeFilterControls', () => {
  it('rangeType 버튼만 aria-pressed true, 클릭 시 onRangeChange 호출', () => {
    const props = setup({ rangeType: '30d' })

    expect(screen.getByRole('button', { name: '30일' })).toHaveAttribute('aria-pressed', 'true')
    for (const name of ['7일', '전체', '입력']) {
      expect(screen.getByRole('button', { name })).toHaveAttribute('aria-pressed', 'false')
    }
    fireEvent.click(screen.getByRole('button', { name: '전체' }))
    expect(props.onRangeChange).toHaveBeenCalledWith('all')
  })

  it('custom이 아니면 날짜 입력이 없다', () => {
    setup()

    expect(screen.queryByLabelText('시작 날짜')).not.toBeInTheDocument()
  })

  it('custom이면 날짜 입력 노출, onChange 콜백 호출, 종료 min은 customFrom', () => {
    const props = setup({ rangeType: 'custom', customFrom: '2026-01-01', customTo: '2026-01-31' })

    expect(screen.getByLabelText('종료 날짜')).toHaveAttribute('min', '2026-01-01')
    fireEvent.change(screen.getByLabelText('시작 날짜'), { target: { value: '2026-01-05' } })
    fireEvent.change(screen.getByLabelText('종료 날짜'), { target: { value: '2026-02-01' } })
    expect(props.onCustomFromChange).toHaveBeenCalledWith('2026-01-05')
    expect(props.onCustomToChange).toHaveBeenCalledWith('2026-02-01')
  })

  it('customFrom이 비면 종료 날짜에 min 없음', () => {
    setup({ rangeType: 'custom' })

    expect(screen.getByLabelText('종료 날짜')).not.toHaveAttribute('min')
  })

  it('extraFilters 렌더', () => {
    setup({ extraFilters: <span>추가 필터</span> })

    expect(screen.getByText('추가 필터')).toBeInTheDocument()
  })
})
