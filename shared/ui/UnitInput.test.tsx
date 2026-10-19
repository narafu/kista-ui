import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { UnitInput } from './UnitInput'

function ControlledUnitInput({ maxDecimals }: { maxDecimals?: number } = {}) {
  const [value, setValue] = useState<number | null>(null)
  return (
    <UnitInput
      value={value}
      onChange={setValue}
      unit="USD"
      disabled={false}
      ariaLabel="평단가"
      maxDecimals={maxDecimals}
    />
  )
}

describe('UnitInput', () => {
  it('keeps a trailing decimal point visible while typing', () => {
    render(<ControlledUnitInput />)
    const input = screen.getByLabelText('평단가') as HTMLInputElement

    fireEvent.change(input, { target: { value: '87' } })
    fireEvent.change(input, { target: { value: '87.' } })

    expect(input.value).toBe('87.')
  })

  it('allows entering a value with two decimal places', () => {
    render(<ControlledUnitInput />)
    const input = screen.getByLabelText('평단가') as HTMLInputElement

    fireEvent.change(input, { target: { value: '87' } })
    fireEvent.change(input, { target: { value: '87.' } })
    fireEvent.change(input, { target: { value: '87.5' } })
    fireEvent.change(input, { target: { value: '87.50' } })

    expect(input.value).toBe('87.50')
  })

  it('rejects a third decimal digit when maxDecimals is 2', () => {
    render(<ControlledUnitInput maxDecimals={2} />)
    const input = screen.getByLabelText('평단가') as HTMLInputElement

    fireEvent.change(input, { target: { value: '87.50' } })
    fireEvent.change(input, { target: { value: '87.505' } })

    expect(input.value).toBe('87.50')
  })

  it('lets touch gestures pass through a disabled input to its scroll container', () => {
    render(
      <UnitInput
        value={0}
        onChange={() => {}}
        unit="주"
        disabled={true}
        ariaLabel="비활성 입력"
      />,
    )

    expect(screen.getByLabelText('비활성 입력')).toHaveClass('disabled:pointer-events-none')
  })

  it('focuses the input when the unit inside the box is clicked', async () => {
    render(<ControlledUnitInput />)

    await userEvent.click(screen.getByText('USD'))

    expect(screen.getByLabelText('평단가')).toHaveFocus()
  })

  it('reads the unit as a description, not as part of the label name', () => {
    render(
      <>
        <label htmlFor="grace">gradient 유예(주)</label>
        <UnitInput id="grace" value={null} onChange={() => {}} unit="주" disabled={false} />
      </>,
    )

    const input = screen.getByRole('textbox', { name: 'gradient 유예(주)' })
    expect(input).toHaveAccessibleDescription('주')
  })
})
