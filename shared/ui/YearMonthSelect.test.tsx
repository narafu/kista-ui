import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { YearMonthSelect } from './YearMonthSelect'

describe('YearMonthSelect', () => {
  it('트리거에 선택된 연·월을 표시하고 네이티브 month input을 쓰지 않는다', () => {
    render(<YearMonthSelect value="2026-08" onValueChange={() => {}} today="2026-08-23" />)

    expect(screen.getByRole('button', { name: /기준 연월/ })).toHaveTextContent('2026년 8월')
    expect(document.querySelector('input[type="month"]')).not.toBeInTheDocument()
  })

  it('연도 화살표로 이동한 뒤 월을 고르면 zero-padding된 YYYY-MM을 넘기고 팝오버를 닫는다', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()
    render(<YearMonthSelect value="2026-08" onValueChange={onValueChange} today="2026-08-23" />)

    await user.click(screen.getByRole('button', { name: /기준 연월/ }))
    await user.click(screen.getByRole('button', { name: '이전 연도' }))
    await user.click(screen.getByRole('button', { name: '2025년 3월' }))

    expect(onValueChange).toHaveBeenCalledWith('2025-03')
    expect(screen.queryByRole('button', { name: '2025년 3월' })).not.toBeInTheDocument()
  })

  it('팝오버를 다시 열면 넘겨보던 연도가 선택값 기준으로 되돌아온다', async () => {
    const user = userEvent.setup()
    render(<YearMonthSelect value="2026-08" onValueChange={() => {}} today="2026-08-23" />)

    await user.click(screen.getByRole('button', { name: /기준 연월/ }))
    await user.click(screen.getByRole('button', { name: '이전 연도' }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: /기준 연월/ }))

    expect(screen.getByRole('button', { name: '2026년 6월' })).toBeInTheDocument()
  })

  it('minYear/maxYear로 이동 범위를 제한하되 현재 선택 연도는 항상 포함한다', async () => {
    const user = userEvent.setup()
    // 선택값(2010)이 기본 범위 밖이라 하한이 2010까지 넓어진다 — 그 아래로는 못 간다.
    render(<YearMonthSelect value="2010-03" onValueChange={() => {}} today="2026-08-23" maxYear={2011} />)

    await user.click(screen.getByRole('button', { name: /기준 연월/ }))

    expect(screen.getByRole('button', { name: '이전 연도' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음 연도' })).toBeEnabled()
  })

  it('현재 연도에서는 미래로 넘어가는 화살표가 비활성화된다', async () => {
    const user = userEvent.setup()
    render(<YearMonthSelect value="2026-08" onValueChange={() => {}} today="2026-08-23" />)

    await user.click(screen.getByRole('button', { name: /기준 연월/ }))

    expect(screen.getByRole('button', { name: '다음 연도' })).toBeDisabled()
  })
})
