import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DeleteStrategyDialog } from './DeleteStrategyDialog'

function renderDialog(disabled: boolean) {
  const onOpenChange = vi.fn()
  render(<DeleteStrategyDialog open={false} onOpenChange={onOpenChange} ticker="UPRO" onConfirm={vi.fn()} disabled={disabled} isDeleting={false} />)
  return onOpenChange
}

describe('DeleteStrategyDialog', () => {
  it('처리 중이면 트리거는 disabled 대신 aria-disabled로 포커스를 유지하고 열리지 않는다', () => {
    const onOpenChange = renderDialog(true)
    const trigger = screen.getByRole('button', { name: '삭제' })
    expect(trigger).not.toBeDisabled()
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(trigger)
    expect(onOpenChange).not.toHaveBeenCalled()
  })
  it('처리 중이 아니면 열린다', () => {
    const onOpenChange = renderDialog(false)
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
  })
})
