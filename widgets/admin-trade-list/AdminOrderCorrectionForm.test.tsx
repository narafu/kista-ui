import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminStrategyOrder } from '@entities/user'
import { AdminOrderCorrectionForm } from './AdminOrderCorrectionForm'

const baseOrder: AdminStrategyOrder = {
  id: 'order-1',
  userId: 'user-1',
  ownerNickname: '홍길동',
  strategyType: 'INFINITE',
  tradeDate: '2026-07-01',
  ticker: 'TSLA',
  direction: 'BUY',
  orderType: 'MOC',
  timing: 'AT_CLOSE',
  quantity: 3,
  price: 312.45,
  status: 'PLANNED',
  externalOrderId: null,
}

describe('AdminOrderCorrectionForm', () => {
  it.each([
    ['PLANNED', '계획 주문 수정', 'PLANNED_EDIT'],
    ['FILLED', '체결 내역 보정', 'FILLED_CORRECTION'],
    ['PARTIALLY_FILLED', '체결 내역 보정', 'FILLED_CORRECTION'],
  ] as const)('renders status-specific submit CTA for %s', (status, ctaLabel, mode) => {
    render(
      <AdminOrderCorrectionForm
        order={{ ...baseOrder, status }}
        disabled={false}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: ctaLabel })).toBeInTheDocument()
    expect(screen.getByText(`보정 모드: ${mode}`)).toBeInTheDocument()
  })

  it('shows stronger placed warning and submits entered values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn(async () => undefined)

    render(
      <AdminOrderCorrectionForm
        order={{ ...baseOrder, status: 'PLACED' }}
        disabled={false}
        onSubmit={onSubmit}
      />,
    )

    expect(screen.getByText('PLACED 주문은 기존 주문을 취소한 뒤 다시 주문합니다. 체결 위험을 확인한 뒤 진행하세요.')).toBeInTheDocument()

    const quantityInput = screen.getByLabelText('보정 수량')
    const priceInput = screen.getByLabelText('보정 가격')
    const memoInput = screen.getByLabelText('보정 메모')

    await user.clear(quantityInput)
    await user.type(quantityInput, '7')
    await user.clear(priceInput)
    await user.type(priceInput, '315.9')
    await user.type(memoInput, '긴급 보정')
    await user.click(screen.getByRole('button', { name: '취소 후 재주문' }))

    expect(onSubmit).toHaveBeenCalledWith({
      mode: 'PLACED_REPLACE',
      direction: 'BUY',
      quantity: 7,
      price: 315.9,
      memo: '긴급 보정',
    })
  })
})
