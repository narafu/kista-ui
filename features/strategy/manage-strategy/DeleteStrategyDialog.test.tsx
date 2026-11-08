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

describe('DeleteStrategyDialog 캡션', () => {
  it('caption이 있으면 트리거의 접근성 설명으로 연결한다', () => {
    render(<DeleteStrategyDialog open={false} onOpenChange={vi.fn()} ticker="UPRO" onConfirm={vi.fn()} disabled={false} isDeleting={false} caption="통계에서도 삭제" />)
    expect(screen.getByRole('button', { name: '삭제' })).toHaveAccessibleDescription('통계에서도 삭제')
  })
  it('caption이 없으면 설명을 연결하지 않는다', () => {
    renderDialog(false)
    expect(screen.getByRole('button', { name: '삭제' })).not.toHaveAttribute('aria-describedby')
  })
})

describe('DeleteStrategyDialog 안내 문구', () => {
  it.each([[undefined, '증권사에'], ['UPBIT', '거래소에']])('broker=%s면 "%s 접수된"으로 안내한다', (broker, word) => {
    render(<DeleteStrategyDialog open onOpenChange={vi.fn()} ticker="BTC" broker={broker} onConfirm={vi.fn()} disabled={false} isDeleting={false} />)
    expect(screen.getByText(new RegExp(`${word} 접수된 미체결 주문`))).toBeInTheDocument()
  })
  it('MOCK이면 "접수된" 없이 안내한다', () => {
    render(<DeleteStrategyDialog open onOpenChange={vi.fn()} ticker="UPRO" broker="MOCK" onConfirm={vi.fn()} disabled={false} isDeleting={false} />)
    const text = screen.getByText(/전략을 삭제하시겠습니까\? 미체결 주문을 먼저 취소하고/).textContent
    expect(text).not.toContain('접수된')
  })
})

describe('DeleteStrategyDialog 통계 안내', () => {
  it('보관되지 않은 전략이면 통계에서 사라진다는 안내와 보관 권유를 보여 준다', () => {
    render(<DeleteStrategyDialog open onOpenChange={vi.fn()} ticker="UPRO" onConfirm={vi.fn()} disabled={false} isDeleting={false} />)
    expect(screen.getByText(/통계에서도 이 전략의 성과가 사라집니다\. 통계를 남기려면 보관하세요\./)).toBeInTheDocument()
  })
  it('보관된 전략이면 보관 권유를 뺀다', () => {
    render(<DeleteStrategyDialog open onOpenChange={vi.fn()} ticker="UPRO" onConfirm={vi.fn()} disabled={false} isDeleting={false} isArchived />)
    const text = screen.getByText(/통계에서도 이 전략의 성과가 사라집니다/).textContent
    expect(text).not.toContain('보관하세요')
  })
})
