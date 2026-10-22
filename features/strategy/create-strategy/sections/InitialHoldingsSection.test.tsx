import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InitialHoldingsSection } from './InitialHoldingsSection'

function getInputByLabelText(labelText: string) {
  return screen.getByLabelText(labelText) as HTMLInputElement
}

describe('InitialHoldingsSection', () => {
  const mockSetField = vi.fn()

  const baseProps = {
    avgPrice: null,
    quantity: null,
    setField: mockSetField,
    loading: false,
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

  it('단위·소수 자릿수 prop을 받는다 (크립토)', () => {
    render(<InitialHoldingsSection {...baseProps} quantityUnit="ETH" quantityMaxDecimals={8} priceUnit="원" priceMaxDecimals={8} />)
    expect(screen.getByText('ETH')).toBeInTheDocument()
    expect(screen.getByText('원')).toBeInTheDocument()
    fireEvent.change(getInputByLabelText('수량'), { target: { value: '0.123456789' } })
    expect(mockSetField).not.toHaveBeenCalled()
    fireEvent.change(getInputByLabelText('수량'), { target: { value: '0.12345678' } })
    expect(mockSetField).toHaveBeenCalledWith('quantity', 0.12345678)
  })

  it('prop이 없으면 기존 USD·주 단위', () => {
    render(<InitialHoldingsSection {...baseProps} />)
    expect(screen.getByText('USD')).toBeInTheDocument()
    expect(screen.getByText('주')).toBeInTheDocument()
  })
})
