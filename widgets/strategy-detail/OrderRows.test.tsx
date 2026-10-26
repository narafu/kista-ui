import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { OrderRows } from './OrderRows'

vi.mock('@entities/meta', async () => {
  const { testLabelOf } = await import('@entities/meta/__fixtures__/testMeta')
  return { useMeta: () => ({ labelOf: testLabelOf }) }
})

describe('OrderRows', () => {
  it('shows cancel buttons for both planned and placed orders', () => {
    const onCancelOne = vi.fn()

    render(
      <OrderRows
        orders={[
          { id: 'order-1', ticker: 'TSLA', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '250', status: 'PLANNED' },
          { id: 'order-2', ticker: 'TSLA', direction: 'SELL', orderType: 'LOC', quantity: 1, price: '255', status: 'PLACED' },
        ]}
        onCancelOne={onCancelOne}
        cancelPending={false}
      />,
    )

    expect(screen.getAllByRole('button', { name: '취소' })).toHaveLength(4)
  })
})
