import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
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
})
