import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { ScheduledStartSection } from './ScheduledStartSection'

describe('ScheduledStartSection', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders the date input with min set to today', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일 (선택)') as HTMLInputElement
    expect(input).toHaveAttribute('min', todayKst())
    expect(input).toHaveValue('')
  })

  it('shows the exclusive-boundary hint text', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={false} />)

    expect(screen.getByText('선택한 날짜 이후 첫 거래일부터 시작됩니다. 비워두면 오늘 시작합니다.')).toBeInTheDocument()
  })

  it('calls onChange with the selected date', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일 (선택)')
    fireEvent.change(input, { target: { value: '2026-08-01' } })

    expect(mockOnChange).toHaveBeenCalledWith('2026-08-01')
  })

  it('calls onChange with null when cleared', () => {
    render(<ScheduledStartSection value="2026-08-01" onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일 (선택)')
    fireEvent.change(input, { target: { value: '' } })

    expect(mockOnChange).toHaveBeenCalledWith(null)
  })

  it('disables the input when loading', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={true} />)

    expect(screen.getByLabelText('시작예정일 (선택)')).toBeDisabled()
  })
})
