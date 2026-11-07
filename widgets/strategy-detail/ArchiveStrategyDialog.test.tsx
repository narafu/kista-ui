import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ArchiveStrategyDialog } from './ArchiveStrategyDialog'

function renderDialog(props: { hasHoldings: boolean; disabled?: boolean }) {
  const onOpenChange = vi.fn()
  render(<ArchiveStrategyDialog open={false} onOpenChange={onOpenChange} ticker="UPRO" onConfirm={vi.fn()} disabled={props.disabled ?? false} isArchiving={false} {...props} />)
  return onOpenChange
}

describe('ArchiveStrategyDialog', () => {
  it('보유 수량이 없으면 열린다', () => {
    const onOpenChange = renderDialog({ hasHoldings: false })
    fireEvent.click(screen.getByRole('button', { name: '보관' }))
    expect(onOpenChange).toHaveBeenCalledWith(true)
    expect(screen.queryByText('보유 수량을 모두 매도한 뒤 보관할 수 있습니다.')).not.toBeInTheDocument()
  })

  it('보유 수량이 있으면 aria-disabled로 막고 사유를 설명으로 연결한다', () => {
    const onOpenChange = renderDialog({ hasHoldings: true })
    const trigger = screen.getByRole('button', { name: '보관' })
    expect(trigger).toHaveAttribute('aria-disabled', 'true')
    expect(trigger).toHaveAccessibleDescription('보유 수량을 모두 매도한 뒤 보관할 수 있습니다.')
    fireEvent.click(trigger)
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('처리 중이면 열리지 않지만 사유 문구는 보이지 않는다', () => {
    const onOpenChange = renderDialog({ hasHoldings: false, disabled: true })
    fireEvent.click(screen.getByRole('button', { name: '보관' }))
    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.queryByText('보유 수량을 모두 매도한 뒤 보관할 수 있습니다.')).not.toBeInTheDocument()
  })

  it('확인 문구에 종목과 되돌릴 수 없음을 안내한다', () => {
    render(<ArchiveStrategyDialog open onOpenChange={vi.fn()} ticker="UPRO" hasHoldings={false} onConfirm={vi.fn()} disabled={false} isArchiving={false} />)
    expect(screen.getByText('UPRO 전략을 보관하시겠습니까? 매매가 멈추고 목록에서 사라지지만 성과는 통계에 남습니다. 보관은 되돌릴 수 없습니다.')).toBeInTheDocument()
  })
})
