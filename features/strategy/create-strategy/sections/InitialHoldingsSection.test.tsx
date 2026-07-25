import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InitialHoldingsSection } from './InitialHoldingsSection'

// Helper to find input within a label that contains specific text
function getInputByLabelText(labelText: string) {
  const labels = screen.getAllByText(labelText)
  const labelElement = labels.find((el) => el.closest('label'))?.closest('label')
  if (labelElement) {
    return within(labelElement).getByRole('textbox') as HTMLInputElement
  }
  return screen.getByLabelText(labelText) as HTMLInputElement
}

describe('InitialHoldingsSection', () => {
  const mockSetField = vi.fn()

  const baseProps = {
    avgPrice: null,
    quantity: null,
    setField: mockSetField,
    loading: false,
    isVr: false,
  }

  beforeEach(() => {
    mockSetField.mockClear()
  })

  it('parses decimal input for avg price and calls setField', () => {
    render(<InitialHoldingsSection {...baseProps} />)

    const avgPriceInput = getInputByLabelText('평단가')
    fireEvent.change(avgPriceInput, { target: { value: '3000.5' } })

    expect(mockSetField).toHaveBeenCalledWith('avgPrice', 3000.5)
  })

  it('parses decimal input for quantity and calls setField', () => {
    render(<InitialHoldingsSection {...baseProps} />)

    const quantityInput = getInputByLabelText('수량')
    fireEvent.change(quantityInput, { target: { value: '10' } })

    expect(mockSetField).toHaveBeenCalledWith('quantity', 10)
  })

  it('clears avg price when input is emptied', () => {
    render(<InitialHoldingsSection {...baseProps} avgPrice={1000} />)

    const avgPriceInput = getInputByLabelText('평단가')
    fireEvent.change(avgPriceInput, { target: { value: '' } })

    expect(mockSetField).toHaveBeenCalledWith('avgPrice', null)
  })

  it('normalizes leading zero numeric input for quantity', () => {
    render(<InitialHoldingsSection {...baseProps} />)

    const quantityInput = getInputByLabelText('수량')
    fireEvent.focus(quantityInput)
    fireEvent.change(quantityInput, { target: { value: '0100' } })

    expect(mockSetField).toHaveBeenCalledWith('quantity', 100)
  })

  it('renders empty avg price and quantity by default', () => {
    render(<InitialHoldingsSection {...baseProps} />)

    expect(getInputByLabelText('평단가')).toHaveValue('')
    expect(getInputByLabelText('수량')).toHaveValue('')
  })

  it('disables both inputs when loading is true', () => {
    render(<InitialHoldingsSection {...baseProps} loading={true} />)

    expect(getInputByLabelText('평단가')).toBeDisabled()
    expect(getInputByLabelText('수량')).toBeDisabled()
  })

  it('renders no hint text for VR', () => {
    render(<InitialHoldingsSection {...baseProps} isVr={true} />)

    expect(screen.queryByText(/비워두면 빈 포지션에서 시작합니다/)).not.toBeInTheDocument()
  })

  it('shows the optional bootstrap hint for non-VR strategies', () => {
    render(<InitialHoldingsSection {...baseProps} isVr={false} />)

    expect(screen.getByText(/비워두면 빈 포지션에서 시작합니다/)).toBeInTheDocument()
  })
})
