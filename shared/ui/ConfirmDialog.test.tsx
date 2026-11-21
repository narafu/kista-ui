import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

type Mutate = (v: string, o?: { onSuccess?: () => void }) => void

// 성공 콜백을 테스트가 원하는 시점에 직접 호출하기 위해 모아 둔다
function setup(initialOpen = true) {
  const successes: Array<() => void> = []
  const mutate = vi.fn<Mutate>((_v, o) => {
    if (o?.onSuccess) successes.push(o.onSuccess)
  })
  const onSuccess = vi.fn()
  function Host() {
    const [open, setOpen] = useState(initialOpen)
    return (
      <>
        <button onClick={() => setOpen(true)}>열기</button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="제목"
          description="설명"
          mutation={{ mutate, isPending: false }}
          variables="v1"
          onSuccess={onSuccess}
        />
      </>
    )
  }
  render(<Host />)
  return { mutate, successes, onSuccess }
}

describe('ConfirmDialog', () => {
  it('onConfirm 방식: 확인 버튼이 onConfirm을 부르고 pending이면 진행 문구로 잠근다', async () => {
    const onConfirm = vi.fn()
    const { rerender } = render(
      <ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" onConfirm={onConfirm} pending={false} />,
    )
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    rerender(<ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" onConfirm={onConfirm} pending />)
    expect(screen.getByRole('button', { name: '삭제 중…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '취소' })).toBeDisabled()
  })

  it('destructive=false면 확인 버튼이 파괴적 색이 아니다', () => {
    const { rerender } = render(<ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" onConfirm={vi.fn()} pending={false} />)
    const destructiveClass = screen.getByRole('button', { name: '삭제' }).className
    rerender(<ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" onConfirm={vi.fn()} pending={false} destructive={false} />)
    expect(screen.getByRole('button', { name: '삭제' }).className).not.toBe(destructiveClass)
  })

  it('typeToConfirm: 문자열을 맞춰야 확인 버튼이 열린다', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog open onOpenChange={vi.fn()} title="t" description="d" onConfirm={onConfirm} pending={false} typeToConfirm="삭제합니다" />)
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
    await userEvent.type(screen.getByRole('textbox'), '삭제합니다')
    expect(screen.getByRole('button', { name: '삭제' })).toBeEnabled()
  })

  it('mutation 방식: 변수로 mutate하고 성공하면 닫는다', async () => {
    const { mutate, successes, onSuccess } = setup()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(mutate).toHaveBeenCalledWith('v1', expect.anything())
    act(() => successes[0]())
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('제목')).not.toBeInTheDocument()
  })

  it('닫힌 뒤 도착한 성공은 다시 닫으려 하지 않는다', async () => {
    const { successes, onSuccess } = setup()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByText('제목')).not.toBeInTheDocument()
    act(() => successes[0]())
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('제목')).not.toBeInTheDocument()
  })

  it('다시 연 뒤 이전 회차의 성공이 도착해도 새 다이얼로그를 닫지 않는다', async () => {
    const { successes } = setup()
    await userEvent.click(screen.getByRole('button', { name: '삭제' }))
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: '열기' }))
    expect(screen.getByText('제목')).toBeInTheDocument()
    act(() => successes[0]())
    expect(screen.getByText('제목')).toBeInTheDocument()
  })

  it('닫히는 중(성공 직후)에는 확인 버튼을 다시 눌러도 mutate를 부르지 않는다', async () => {
    const { mutate, successes } = setup()
    const confirm = screen.getByRole('button', { name: '삭제' })
    await userEvent.click(confirm)
    expect(mutate).toHaveBeenCalledTimes(1)
    act(() => successes[0]())
    // 닫힘 애니메이션 동안 DOM에 남아 있는 버튼은 비활성이어야 한다
    expect(confirm).toBeDisabled()
    await userEvent.click(confirm)
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
