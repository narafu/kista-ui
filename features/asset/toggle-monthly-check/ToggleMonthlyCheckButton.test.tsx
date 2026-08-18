import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToggleMonthlyCheckButton } from './ToggleMonthlyCheckButton'

const { mutateMock } = vi.hoisted(() => ({ mutateMock: vi.fn() }))

vi.mock('@entities/finance', async () => {
  const actual = await vi.importActual<typeof import('@entities/finance')>('@entities/finance')
  return {
    ...actual,
    useSetMonthlyClosingMutation: () => ({ mutate: mutateMock, isPending: false }),
  }
})

const { toastSuccessMock } = vi.hoisted(() => ({ toastSuccessMock: vi.fn() }))

vi.mock('sonner', () => ({ toast: { success: toastSuccessMock } }))

describe('ToggleMonthlyCheckButton', () => {
  beforeEach(() => {
    mutateMock.mockClear()
    toastSuccessMock.mockClear()
  })

  it('미완료 상태에서 클릭하면 completed: true로 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<ToggleMonthlyCheckButton month="2026-08" completed={false} />)

    await user.click(screen.getByRole('button'))

    expect(mutateMock).toHaveBeenCalledWith(
      { month: '2026-08', completed: true },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('완료 상태에서 클릭하면 completed: false로 mutation을 호출한다', async () => {
    const user = userEvent.setup()
    render(<ToggleMonthlyCheckButton month="2026-08" completed />)

    await user.click(screen.getByRole('button'))

    expect(mutateMock).toHaveBeenCalledWith(
      { month: '2026-08', completed: false },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    )
  })

  it('mutation 성공 시 성공 toast를 띄운다', async () => {
    const user = userEvent.setup()
    render(<ToggleMonthlyCheckButton month="2026-08" completed={false} />)

    await user.click(screen.getByRole('button'))

    const options = mutateMock.mock.calls.at(-1)?.[1] as { onSuccess: () => void }
    options.onSuccess()

    expect(toastSuccessMock).toHaveBeenCalledWith('이번 달 기록 점검을 완료로 표시했습니다')
  })

  it('aria-pressed로 현재 완료 상태를 노출한다', () => {
    render(<ToggleMonthlyCheckButton month="2026-08" completed />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('완료 상태에서는 라벨이 완료됨으로 바뀌어 클릭 시 동작(해제)과 일치한다', () => {
    render(<ToggleMonthlyCheckButton month="2026-08" completed />)
    expect(screen.getByRole('button', { name: '기록 점검 완료됨' })).toBeInTheDocument()
  })

  it('미완료 상태에서는 완료 유도 문구를 보여준다', () => {
    render(<ToggleMonthlyCheckButton month="2026-08" completed={false} />)
    expect(screen.getByRole('button', { name: '이번 달 기록 점검 완료' })).toBeInTheDocument()
  })
})
