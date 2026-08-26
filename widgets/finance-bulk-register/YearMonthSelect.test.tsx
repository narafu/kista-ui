import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { YearMonthSelect } from './YearMonthSelect'

describe('YearMonthSelect', () => {
  it('연도와 월을 각각 선택하면 YYYY-MM 문자열로 onChange를 호출한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<YearMonthSelect value="2026-07" onChange={onChange} yearLabel="소스 연도" monthLabel="소스 월" />)

    await user.click(screen.getByRole('combobox', { name: '소스 월' }))
    await user.click(await screen.findByRole('option', { name: '8월' }))

    expect(onChange).toHaveBeenCalledWith('2026-08')
  })

  it('연도 변경 시 월은 유지한 채 onChange를 호출한다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<YearMonthSelect value="2026-07" onChange={onChange} yearLabel="소스 연도" monthLabel="소스 월" />)

    await user.click(screen.getByRole('combobox', { name: '소스 연도' }))
    await user.click(await screen.findByRole('option', { name: '2025년' }))

    expect(onChange).toHaveBeenCalledWith('2025-07')
  })
})
