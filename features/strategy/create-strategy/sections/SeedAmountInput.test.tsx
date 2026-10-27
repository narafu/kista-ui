import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SeedAmountInput } from './SeedAmountInput'

describe('SeedAmountInput', () => {
  it('renders a plain USD input without stepper buttons', () => {
    render(
      <SeedAmountInput
        value={1000}
        onChange={vi.fn()}
        deposit={null}
        minSeed={null}
      />,
    )

    expect(screen.getByLabelText('예수금 (USD)')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '최소시드 단위 감소' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '최소시드 단위 증가' })).not.toBeInTheDocument()
  })

  it('소수점 이하 최대 2자리까지 입력을 허용한다', async () => {
    const user = userEvent.setup()
    render(
      <SeedAmountInput
        value={null}
        onChange={vi.fn()}
        deposit={null}
        minSeed={null}
      />,
    )
    const input = screen.getByLabelText('예수금 (USD)')

    await user.type(input, '123')
    expect(input).toHaveValue('123')

    await user.type(input, '.4')
    expect(input).toHaveValue('123.4')

    await user.type(input, '5')
    expect(input).toHaveValue('123.45')
  })

  it('소수점 3번째 자리 입력은 무시되어 2자리까지만 유지된다', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(
      <SeedAmountInput
        value={null}
        onChange={onChange}
        deposit={null}
        minSeed={null}
      />,
    )
    const input = screen.getByLabelText('예수금 (USD)')

    await user.type(input, '123.45')
    onChange.mockClear()

    await user.type(input, '6')
    expect(input).toHaveValue('123.45')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('소수점만 입력된 중간 상태를 그대로 표시한다', async () => {
    const user = userEvent.setup()
    render(
      <SeedAmountInput
        value={null}
        onChange={vi.fn()}
        deposit={null}
        minSeed={null}
      />,
    )
    const input = screen.getByLabelText('예수금 (USD)')

    await user.type(input, '12.')
    expect(input).toHaveValue('12.')
  })

  it('예수금이 null이어도 조회 불가 안내 없이 최소 시드 안내로 떨어진다', () => {
    render(<SeedAmountInput value={null} onChange={vi.fn()} deposit={null} minSeed={100} />)

    expect(screen.queryByText('예수금 조회 불가')).not.toBeInTheDocument()
    expect(screen.getByText('최소 $100.00')).toBeInTheDocument()
  })

  it('입력 시드가 예수금을 넘으면 경고성 안내만 보이고 입력은 막지 않는다', () => {
    render(<SeedAmountInput value={1500} onChange={vi.fn()} deposit={1000} minSeed={100} />)

    expect(screen.getByText('추가 입금 필요')).toBeInTheDocument()
    expect(screen.getByLabelText('예수금 (USD)')).toBeEnabled()
  })
})
