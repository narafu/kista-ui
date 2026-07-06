import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VrFields } from '../model/useStrategyForm'
import { VrSettingsSection } from './VrSettingsSection'

// Helper to find input within a label that contains specific text
function getInputByLabelText(labelText: string) {
  const labels = screen.getAllByText(labelText)
  const labelElement = labels.find((el) => el.closest('label'))?.closest('label')
  if (!labelElement) {
    throw new Error(`Label with text "${labelText}" not found`)
  }
  return within(labelElement).getByRole('spinbutton') as HTMLInputElement
}

describe('VrSettingsSection', () => {
  const mockSetField = vi.fn()

  const baseProps = {
    setField: mockSetField,
    loading: false,
    isEdit: false,
  }

  const baseFields: VrFields = {
    initialValue: null,
    intervalWeeks: 4,
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

    it('preserves decimal input for interval weeks so form validation can reject it', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const intervalInput = getInputByLabelText('리밸런싱 주기(주)')
      fireEvent.change(intervalInput, { target: { value: '3.7' } })

      expect(mockSetField).toHaveBeenCalledWith('intervalWeeks', 3.7)
    })

    it('allows negative numbers for recurring amount (주기당 입출금)', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const recurringInput = getInputByLabelText('주기당 입출금')
      fireEvent.change(recurringInput, { target: { value: '-100' } })

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', -100)
    })

    it('preserves decimal recurring amount so form validation can reject it', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
        />,
      )

      const recurringInput = getInputByLabelText('주기당 입출금')
      fireEvent.change(recurringInput, { target: { value: '10.5' } })

      expect(mockSetField).toHaveBeenCalledWith('recurringAmount', 10.5)
    })
  })

  describe('disabled state', () => {
    it('disables all inputs when isEdit is true and shows edit restriction message', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={true}
        />,
      )

      const initialValueInput = getInputByLabelText('초기 V값') as HTMLInputElement
      const intervalInput = getInputByLabelText('리밸런싱 주기(주)') as HTMLInputElement
      const bandWidthInput = getInputByLabelText('밴드 폭(%)') as HTMLInputElement
      const recurringInput = getInputByLabelText('주기당 입출금') as HTMLInputElement

      expect(initialValueInput.disabled).toBe(true)
      expect(intervalInput.disabled).toBe(true)
      expect(bandWidthInput.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)

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
      const intervalInput = getInputByLabelText('리밸런싱 주기(주)') as HTMLInputElement
      const bandWidthInput = getInputByLabelText('밴드 폭(%)') as HTMLInputElement
      const recurringInput = getInputByLabelText('주기당 입출금') as HTMLInputElement

      expect(initialValueInput.disabled).toBe(true)
      expect(intervalInput.disabled).toBe(true)
      expect(bandWidthInput.disabled).toBe(true)
      expect(recurringInput.disabled).toBe(true)
    })
  })

  describe('guidance messages', () => {
    it('shows initial value and pool guidance message when isEdit is false (create mode)', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={false}
        />,
      )

      expect(screen.getByText('초기 V는 보유 중인 TQQQ 평가금, 초기 pool은 현재 USD 예수금입니다. 적립식은 둘 다 0이어도 등록할 수 있습니다.')).toBeInTheDocument()
    })

    it('hides TQQQ guidance message when isEdit is true (edit mode)', () => {
      render(
        <VrSettingsSection
          fields={baseFields}
          {...baseProps}
          isEdit={true}
        />,
      )

      expect(screen.queryByText(/TQQQ 보유가 없어도/)).not.toBeInTheDocument()
    })
  })
})
