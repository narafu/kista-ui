import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayKst } from '@shared/lib/format'
import { ScheduledStartSection } from './ScheduledStartSection'

describe('ScheduledStartSection', () => {
  const mockOnChange = vi.fn()

  beforeEach(() => {
    mockOnChange.mockClear()
  })

  it('renders a required date input with min set to today', () => {
    render(<ScheduledStartSection value={todayKst()} onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일') as HTMLInputElement
    expect(input).toHaveAttribute('min', todayKst())
    expect(input).toBeRequired()
    expect(input).toHaveValue(todayKst())
  })

  it('calls onChange with the selected date', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일')
    fireEvent.change(input, { target: { value: '2026-08-01' } })

    expect(mockOnChange).toHaveBeenCalledWith('2026-08-01')
  })

  it('falls back to today when cleared', () => {
    render(<ScheduledStartSection value="2026-08-01" onChange={mockOnChange} loading={false} />)

    const input = screen.getByLabelText('시작예정일')
    fireEvent.change(input, { target: { value: '' } })

    expect(mockOnChange).toHaveBeenCalledWith(todayKst())
  })

  it('disables the input when loading', () => {
    render(<ScheduledStartSection value={null} onChange={mockOnChange} loading={true} />)

    expect(screen.getByLabelText('시작예정일')).toBeDisabled()
  })
})
