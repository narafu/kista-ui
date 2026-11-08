import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CloseStrategyDialog } from './CloseStrategyDialog'

function setup(props: Partial<React.ComponentProps<typeof CloseStrategyDialog>> = {}) {
  const onArchive = vi.fn()
  const onDelete = vi.fn()
  render(
    <CloseStrategyDialog open onOpenChange={vi.fn()} ticker="UPRO" broker="KIS" hasHoldings={false}
      onArchive={onArchive} onDelete={onDelete} disabled={false} isArchiving={false} isDeleting={false} {...props} />,
  )
  return { onArchive, onDelete }
}

describe('CloseStrategyDialog', () => {
  it('기본은 보관이고 확인하면 onArchive만 호출한다', () => {
    const { onArchive, onDelete } = setup()
    expect(screen.getByRole('radio', { name: /^보관/ })).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: '보관' }))
    expect(onArchive).toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('삭제를 고르면 확인 버튼이 삭제로 바뀌고 onDelete만 호출한다', () => {
    const { onArchive, onDelete } = setup()
    fireEvent.click(screen.getByRole('radio', { name: /^삭제/ }))
    fireEvent.click(screen.getByRole('button', { name: '삭제' }))
    expect(onDelete).toHaveBeenCalled()
    expect(onArchive).not.toHaveBeenCalled()
  })

  it('보유 수량이 있으면 보관을 막고 삭제를 선택한 채 사유를 보여 준다', () => {
    setup({ hasHoldings: true })
    expect(screen.getByRole('radio', { name: /^보관/ })).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByRole('radio', { name: /^삭제/ })).toBeChecked()
    expect(screen.getByText('보유 수량이 남아 있으면 보관할 수 없습니다.')).toBeInTheDocument()
  })

  it('처리 중이면 트리거가 aria-disabled이고 열기를 막는다', () => {
    const onOpenChange = vi.fn()
    render(<CloseStrategyDialog open={false} onOpenChange={onOpenChange} ticker="UPRO" hasHoldings={false}
      onArchive={vi.fn()} onDelete={vi.fn()} disabled isArchiving={false} isDeleting={false} />)
    const trigger = screen.getByRole('button', { name: '전략 종료' })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    fireEvent.click(trigger)
    expect(onOpenChange).not.toHaveBeenCalled()
  })
})
