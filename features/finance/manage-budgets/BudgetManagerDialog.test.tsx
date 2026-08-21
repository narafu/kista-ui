import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BudgetManagerDialog } from './BudgetManagerDialog'

vi.mock('@entities/meta', () => ({
  useMeta: () => ({ labelOf: (_group: string, code: string) => (code === 'EXPENSE' ? '소비' : code) }),
}))
vi.mock('./BudgetManager', () => ({
  BudgetManager: ({ type }: { type: string }) => <div data-testid="budget-manager">{type}</div>,
}))

describe('BudgetManagerDialog', () => {
  it('버튼 클릭 전에는 다이얼로그가 마운트되지 않는다', () => {
    render(<BudgetManagerDialog type="EXPENSE" />)
    expect(screen.queryByTestId('budget-manager')).not.toBeInTheDocument()
  })

  it('예산 등록 버튼을 클릭하면 해당 타입의 BudgetManager가 담긴 다이얼로그가 열린다', async () => {
    const user = userEvent.setup()
    render(<BudgetManagerDialog type="EXPENSE" />)

    await user.click(screen.getByRole('button', { name: '예산 등록' }))

    expect(screen.getByText('소비 예산 관리')).toBeInTheDocument()
    expect(screen.getByTestId('budget-manager')).toHaveTextContent('EXPENSE')
  })
})
