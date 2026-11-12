import { useState } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FormDialog } from './FormDialog'

function Harness({ onOpenChange, onClose }: { onOpenChange: (open: boolean) => void; onClose?: (close: () => void) => void }) {
  const [open, setOpen] = useState(false)
  const change = (next: boolean) => { onOpenChange(next); setOpen(next) }
  return (
    <>
      <button type="button" onClick={() => change(true)}>열기</button>
      <FormDialog open={open} onOpenChange={change} title="투자금 추가" description="설명">
        {(close) => { onClose?.(close); return <button type="button" onClick={close}>취소</button> }}
      </FormDialog>
    </>
  )
}

describe('FormDialog', () => {
  beforeEach(() => {
    window.history.replaceState(null, '')
    // jsdom의 history.back은 popstate를 보내지 않는다 — 브라우저처럼 다음 태스크에 보낸다
    vi.spyOn(window.history, 'back').mockImplementation(() => {
      setTimeout(() => window.dispatchEvent(new PopStateEvent('popstate', { state: null })))
    })
  })
  afterEach(() => vi.restoreAllMocks())

  it('열면 이력 한 칸을 쌓고 제목을 대화상자 이름으로 건다', async () => {
    const push = vi.spyOn(window.history, 'pushState')
    render(<Harness onOpenChange={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    expect(await screen.findByRole('dialog', { name: '투자금 추가' })).toBeInTheDocument()
    expect(push).toHaveBeenCalledTimes(1)
  })

  it('close는 history.back을 거쳐 popstate에서 닫는다', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    act(() => screen.getByRole('button', { name: '취소' }).click())
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))
    expect(window.history.back).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('popstate 전에 닫기가 또 불려도 한 칸만 되돌아간다', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    const cancel = screen.getByRole('button', { name: '취소' })
    act(() => { cancel.click(); cancel.click() })
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))
    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('닫았다 다시 열어도 닫기가 동작한다', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: '열기' }))
      act(() => screen.getByRole('button', { name: '취소' }).click())
      await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    }
    expect(window.history.back).toHaveBeenCalledTimes(2)
  })

  it('ESC도 같은 경로(history.back)로 닫는다', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' })
    await waitFor(() => expect(onOpenChange).toHaveBeenLastCalledWith(false))
    expect(window.history.back).toHaveBeenCalledTimes(1)
  })

  it('브라우저 뒤로 가기(popstate)로 닫힌다', async () => {
    const onOpenChange = vi.fn()
    render(<Harness onOpenChange={onOpenChange} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    await screen.findByRole('dialog')
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: null })) })
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })

  it('뒤로 가기로 닫힌 뒤 늦게 도착한 close는 화면을 떠나지 않는다', async () => {
    let lateClose = () => {}
    render(<Harness onOpenChange={() => {}} onClose={(c) => { lateClose = c }} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    await screen.findByRole('dialog')
    act(() => { window.dispatchEvent(new PopStateEvent('popstate', { state: null })) })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    act(() => lateClose())
    expect(window.history.back).not.toHaveBeenCalled()
  })

  it('이전 회차의 close는 다시 연 다이얼로그를 닫지 않는다', async () => {
    let firstClose = () => {}
    let captured = false
    render(<Harness onOpenChange={() => {}} onClose={(c) => { if (!captured) { firstClose = c; captured = true } }} />)
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    act(() => screen.getByRole('button', { name: '취소' }).click())
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: '열기' }))
    await screen.findByRole('dialog')
    act(() => firstClose())
    expect(window.history.back).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
