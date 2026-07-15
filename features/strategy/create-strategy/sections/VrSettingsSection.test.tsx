import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VrFields } from '../model/useStrategyForm'
import { VrSettingsSection } from './VrSettingsSection'

// Helper to find input within a label that contains specific text
function getInputByLabelText(labelText: string) {
  const labels = screen.getAllByText(labelText)
  const labelElement = labels.find((el) => el.closest('label'))?.closest('label')
  if (labelElement) {
    return within(labelElement).getByRole('textbox') as HTMLInputElement
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
    settings: {
      recurringMode: { customizable: true, allowedValues: ['DEPOSIT', 'HOLD', 'WITHDRAW'], defaultValue: 'HOLD' },
      bandWidth: { customizable: true, allowedValues: [10, 15, 20], defaultValue: 15 },
      intervalWeeks: { customizable: true, allowedValues: [1, 2, 4], defaultValue: 2 },
    },
  }

  const baseFields: VrFields = {
    initialValue: 0,
    intervalWeeks: 2,
    bandWidth: 15,
    recurringAmount: 0,
  }

  beforeEach(() => {
    mockSetField.mockClear()
  })

  describe('number parsing', () => {
    it('parses decimal input for initial value (V값) and calls setField', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값')
      fireEvent.change(initialValueInput, { target: { value: '3000.5' } })

      expect(mockSetField).toHaveBeenCalledWith('initialValue', 3000.5)
    })

    it('clears initial value when input is emptied', () => {
      render(
        <VrSettingsSection
          fields={{ ...baseFields, initialValue: 1000 }}
          {...baseProps}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값')
      fireEvent.change(initialValueInput, { target: { value: '' } })

      expect(mockSetField).toHaveBeenCalledWith('initialValue', null)
    })

    it('normalizes leading zero numeric input for initial value', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값')
      fireEvent.focus(initialValueInput)
      fireEvent.change(initialValueInput, { target: { value: '0100' } })

      expect(mockSetField).toHaveBeenCalledWith('initialValue', 100)
    })

    it('uses mobile-safe input font size to prevent focus zoom', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      expect(getInputByLabelText('초기 V값')).toHaveClass('text-base')
      expect(getInputByLabelText('적립금(+)/인출금(-)')).toHaveClass('text-base')
    })

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
      expect(getInputByLabelText('초기 V값')).toBeEnabled()
    })

    it('locks HOLD-only recurring controls without locking initial V', () => {
      render(<VrSettingsSection fields={baseFields} {...baseProps} settings={{
        ...baseProps.settings,
        recurringMode: { customizable: false, allowedValues: ['HOLD'], defaultValue: 'HOLD' },
      }} />)

      expect(screen.getByRole('button', { name: '+ 적립' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '거치' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '- 인출' })).toBeDisabled()
      expect(getInputByLabelText('초기 V값')).toBeEnabled()
    })
    it('disables all inputs when isEdit is true and shows edit restriction message', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={true}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값') as HTMLInputElement
      const intervalButton = screen.getByRole('button', { name: '2주' }) as HTMLButtonElement
      const bandWidthButton = screen.getByRole('button', { name: '15%' }) as HTMLButtonElement
      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
      const depositButton = screen.getByRole('button', { name: '+ 적립' }) as HTMLButtonElement
      const holdButton = screen.getByRole('button', { name: '거치' }) as HTMLButtonElement
      const withdrawalButton = screen.getByRole('button', { name: '- 인출' }) as HTMLButtonElement

      expect(initialValueInput.disabled).toBe(true)
      expect(intervalButton.disabled).toBe(true)
      expect(bandWidthButton.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)
      expect(depositButton.disabled).toBe(true)
      expect(holdButton.disabled).toBe(true)
      expect(withdrawalButton.disabled).toBe(true)

      expect(screen.getByText('VR 상세 설정은 등록 후 변경할 수 없습니다.')).toBeInTheDocument()
    })

    it('disables all inputs when loading is true', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          loading={true}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값') as HTMLInputElement
      const intervalButton = screen.getByRole('button', { name: '2주' }) as HTMLButtonElement
      const bandWidthButton = screen.getByRole('button', { name: '15%' }) as HTMLButtonElement
      const recurringInput = getInputByLabelText('적립금(+)/인출금(-)') as HTMLInputElement
      const depositButton = screen.getByRole('button', { name: '+ 적립' }) as HTMLButtonElement
      const holdButton = screen.getByRole('button', { name: '거치' }) as HTMLButtonElement
      const withdrawalButton = screen.getByRole('button', { name: '- 인출' }) as HTMLButtonElement

      expect(initialValueInput.disabled).toBe(true)
      expect(intervalButton.disabled).toBe(true)
      expect(bandWidthButton.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)
      expect(depositButton.disabled).toBe(true)
      expect(holdButton.disabled).toBe(true)
      expect(withdrawalButton.disabled).toBe(true)
    })
  })

  describe('guidance messages', () => {
    it('does not show the removed create guidance message', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={false}
        />,
      )

      expect(screen.queryByText(/초기 V는 보유 중인 TQQQ 평가금/)).not.toBeInTheDocument()
      expect(screen.queryByText(/적립식은 둘 다 0이어도 등록할 수 있습니다/)).not.toBeInTheDocument()
    })

    it('hides TQQQ guidance message when isEdit is true (edit mode)', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={true}
        />,
      )

      expect(screen.queryByText(/초기 V는 보유 중인 TQQQ 평가금/)).not.toBeInTheDocument()
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
    it('renders default values and no placeholder for initial value', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값')
      const intervalButton = screen.getByRole('button', { name: '2주' })

      expect(initialValueInput).toHaveValue('0')
      expect(initialValueInput).not.toHaveAttribute('placeholder')
      expect(intervalButton).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '15%' })).toHaveAttribute('aria-pressed', 'true')
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

    it('places recurring amount before band width and interval', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const recurringLabel = screen.getByText('적립금(+)/인출금(-)')
      const bandWidthLabel = screen.getByText('밴드 폭')
      const intervalLabel = screen.getByText('리밸런싱 주기')

      expect(recurringLabel.compareDocumentPosition(bandWidthLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      expect(bandWidthLabel.compareDocumentPosition(intervalLabel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('renders units in controls and removes helper copy', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      expect(screen.getAllByText('USD')).toHaveLength(2)
      expect(screen.getByRole('button', { name: '+ 적립' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: '거치' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: '- 인출' })).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByRole('button', { name: '15%' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2주' })).toBeInTheDocument()
      expect(screen.queryByText(/양수=향후 입금/)).not.toBeInTheDocument()
      expect(screen.queryByText('VR 전략 전용')).not.toBeInTheDocument()
    })
  })
})
