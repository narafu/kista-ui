import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { YearSelect } from './YearSelect'

describe('YearSelect', () => {
  it('트리거에 선택된 연도를 표시한다', () => {
    render(<YearSelect value={2026} onValueChange={() => {}} today="2026-08-23" />)

    expect(screen.getByRole('button', { name: /기준 연도/ })).toHaveTextContent('2026년')
  })

  it('팝오버에서 연도를 고르면 숫자로 onValueChange를 호출하고 닫는다', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<YearSelect value={2026} onValueChange={onValueChange} today="2026-08-23" />)

    await user.click(screen.getByRole('button', { name: /기준 연도/ }))
    await user.click(screen.getByRole('button', { name: '2023년' }))

    expect(onValueChange).toHaveBeenCalledWith(2023)
    expect(screen.queryByRole('button', { name: '2023년' })).not.toBeInTheDocument()
  })

  it('기본 범위는 today 기준 15개년이며 선택값이 밖이면 포함한다', async () => {
    const user = userEvent.setup()
    render(<YearSelect value={2009} onValueChange={() => {}} today="2026-08-23" />)

    await user.click(screen.getByRole('button', { name: /기준 연도/ }))

    expect(screen.getByRole('button', { name: '2026년' })).toBeInTheDocument() // 상한(올해)
    expect(screen.getByRole('button', { name: '2009년' })).toBeInTheDocument() // 선택값까지 확장
    expect(screen.queryByRole('button', { name: '2027년' })).not.toBeInTheDocument()
  })

  it('minYear/maxYear로 범위를 제한한다', async () => {
    const user = userEvent.setup()
    render(<YearSelect value={2024} onValueChange={() => {}} today="2026-08-23" minYear={2022} maxYear={2025} />)

    await user.click(screen.getByRole('button', { name: /기준 연도/ }))

    expect(screen.getByRole('button', { name: '2025년' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2022년' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2021년' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '2026년' })).not.toBeInTheDocument()
  })
})
