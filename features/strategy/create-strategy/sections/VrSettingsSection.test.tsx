import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VrFields } from '../model/useStrategyForm'
import { VrSettingsSection } from './VrSettingsSection'

// Helper to find input within a label that contains specific text
function getInputByLabelText(labelText: string) {
  const labels = screen.getAllByText(labelText)
  const labelElement = labels.find((el) => el.closest('label'))?.closest('label')
  if (labelElement) {
    return labelElement.querySelector('input') as HTMLInputElement
  }
  return screen.getByLabelText(labelText) as HTMLInputElement
}

describe('VrSettingsSection', () => {
  const mockSetField = vi.fn()

  const baseProps = {
    setField: mockSetField,
    recurringMode: 'HOLD' as const,
    setRecurringMode: vi.fn(),
    loading: false,
    isEdit: false,
    initialVrValue: 0,
    settings: {
      recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
      bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 },
      intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 },
    },
  }

  const baseFields: VrFields = {
    avgPrice: null,
    quantity: null,
    intervalWeeks: 2,
    bandWidth: 15,
    recurringAmount: 0,
    initialGradient: null,
    gGraceWeeks: null,
    gStepWeeks: null,
    gMax: null,
    initialPoolLimitRate: null,
    pGraceWeeks: null,
    pStepWeeks: null,
    poolLimitFloor: null,
  }

  beforeEach(() => {
    mockSetField.mockClear()
  })

  describe('number parsing', () => {
    it('sets recurring amount sign with deposit and withdrawal toggles', () => {
      const { rerender } = render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)')
      fireEvent.change(recurringInput, { target: { value: '100' } })

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', 100)

      rerender(
        <VrSettingsSection
          fields={{ ...baseFields, recurringAmount: 100 }}
          {...baseProps}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '- 인출' }))

      expect(baseProps.setRecurringMode).toHaveBeenCalledWith('WITHDRAW')

      rerender(
        <VrSettingsSection
          fields={{ ...baseFields, recurringAmount: -100 }}
          {...baseProps}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '+ 적립' }))

      expect(baseProps.setRecurringMode).toHaveBeenCalledWith('DEPOSIT')
    })

    it('sets recurring amount to zero and disables input when hold is selected', () => {
      render(
        <VrSettingsSection
          fields={{ ...baseFields, recurringAmount: 100 }}
          {...baseProps}
        />,
      )

      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)')
      fireEvent.click(screen.getByRole('button', { name: '거치' }))

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', 0)
      expect(baseProps.setRecurringMode).toHaveBeenCalledWith('HOLD')
      expect(recurringInput).toBeDisabled()
    })

    it('keeps withdrawal selected before an amount is entered', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      fireEvent.click(screen.getByRole('button', { name: '- 인출' }))

      expect(baseProps.setRecurringMode).toHaveBeenCalledWith('WITHDRAW')

      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)')
      fireEvent.change(recurringInput, { target: { value: '100' } })

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', 100)
    })

    it('preserves decimal recurring amount so form validation can reject it', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)')
      fireEvent.change(recurringInput, { target: { value: '10.5' } })

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', 10.5)
    })
  })

  describe('disabled state', () => {
    it.each([
      [['HOLD'], [true, false, true]],
      [['DEPOSIT', 'HOLD'], [false, false, true]],
      [['HOLD', 'WITHDRAW'], [true, false, false]],
    ])('maps asymmetric allowed modes %j to matching buttons', (allowedValues, disabledStates) => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} settings={{
        ...baseProps.settings,
        recurringMode: { customizable: true, allowedValues, defaultValue: 'HOLD' },
      }} />)

      expect(screen.getByRole('button', { name: '+ 적립' })).toHaveProperty('disabled', disabledStates[0])
      expect(screen.getByRole('button', { name: '거치' })).toHaveProperty('disabled', disabledStates[1])
      expect(screen.getByRole('button', { name: '- 인출' })).toHaveProperty('disabled', disabledStates[2])
    })

    it('locks HOLD-only recurring controls', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} settings={{
        ...baseProps.settings,
        recurringMode: { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' },
      }} />)

      expect(screen.getByRole('button', { name: '+ 적립' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '거치' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '- 인출' })).toBeDisabled()
    })

    it('shows read-only initial V value and disables all inputs when isEdit is true', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={true}
          initialVrValue={3000}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값') as HTMLInputElement
      const intervalButton = screen.getByRole('button', { name: '2주' }) as HTMLButtonElement
      const bandWidthButton = screen.getByRole('button', { name: '15%' }) as HTMLButtonElement
      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
      const depositButton = screen.getByRole('button', { name: '+ 적립' }) as HTMLButtonElement
      const holdButton = screen.getByRole('button', { name: '거치' }) as HTMLButtonElement
      const withdrawalButton = screen.getByRole('button', { name: '- 인출' }) as HTMLButtonElement

      expect(initialValueInput.value).toBe('3000')
      expect(initialValueInput.disabled).toBe(true)
      expect(intervalButton.disabled).toBe(true)
      expect(bandWidthButton.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)
      expect(depositButton.disabled).toBe(true)
      expect(holdButton.disabled).toBe(true)
      expect(withdrawalButton.disabled).toBe(true)

      expect(screen.getByText('VR 상세 설정은 등록 후 변경할 수 없습니다.')).toBeInTheDocument()
    })

    it('does not render the read-only initial V value input in create mode', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={false}
        />,
      )

      expect(screen.queryByText('초기 V값')).not.toBeInTheDocument()
    })

    it('disables all inputs when loading is true', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          loading={true}
        />,
      )

      const intervalButton = screen.getByRole('button', { name: '2주' }) as HTMLButtonElement
      const bandWidthButton = screen.getByRole('button', { name: '15%' }) as HTMLButtonElement
      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
      const depositButton = screen.getByRole('button', { name: '+ 적립' }) as HTMLButtonElement
      const holdButton = screen.getByRole('button', { name: '거치' }) as HTMLButtonElement
      const withdrawalButton = screen.getByRole('button', { name: '- 인출' }) as HTMLButtonElement

      expect(intervalButton.disabled).toBe(true)
      expect(bandWidthButton.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)
      expect(depositButton.disabled).toBe(true)
      expect(holdButton.disabled).toBe(true)
      expect(withdrawalButton.disabled).toBe(true)
    })
  })

  describe('defaults and ordering', () => {
    it('renders only runtime band width and interval choices', () => {
      render(
        <VrSettingsSection
          fields={{ ...baseFields, bandWidth: 25, intervalWeeks: 3 }}
          {...baseProps}
          settings={{
            ...baseProps.settings,
            bandWidth: { customizable: true, allowedValues: [25], defaultValue: 25 },
            intervalWeeks: { customizable: true, allowedValues: [3], defaultValue: 3 },
          }}
        />,
      )

      expect(screen.getByRole('button', { name: '25%' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '3주' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '15%' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '2주' })).not.toBeInTheDocument()
    })

    it('applies default recurring/band/interval selection', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const intervalButton = screen.getByRole('button', { name: '2주' })

      expect(intervalButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '15%' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '+ 적립' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: '거치' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '- 인출' })).toHaveAttribute('aria-pressed', 'false')
    })

    it('uses fixed choices for band width and interval weeks', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: /%$/ })).toHaveLength(3)
      expect(screen.getAllByRole('button', { name: /주$/ })).toHaveLength(3)

      fireEvent.click(screen.getByRole('button', { name: '20%' }))
      fireEvent.click(screen.getByRole('button', { name: '4주' }))

      expect(mockSetField).toHaveBeenCalledWith('bandWidth', 20)
      expect(mockSetField).toHaveBeenCalledWith('intervalWeeks', 4)
    })
  })
})
