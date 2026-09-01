import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { FinanceHeader } from './FinanceHeader'

let pathname = '/finance'

vi.mock('next/navigation', () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@features/asset/save-asset', () => ({
  NewAssetButton: () => <button type="button">자산 등록</button>,
}))
vi.mock('@features/finance/save-transaction', () => ({
  NewTransactionButton: ({ type }: { type: string }) => <button type="button">내역 등록 ({type})</button>,
}))
vi.mock('@features/finance/manage-budgets', () => ({
  BudgetManagerDialog: ({ type }: { type: string }) => <button type="button">예산 등록 ({type})</button>,
}))

describe('FinanceHeader', () => {
  it('자산 탭에서는 제목이 "내 자산"이고 자산 등록 버튼만 보여준다', () => {
    pathname = '/finance'
    render(<FinanceHeader />)

    expect(screen.getByRole('heading', { name: '내 자산' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '자산 등록' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /예산 등록/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '자산' })).toHaveAttribute('aria-current', 'page')
  })

  it('수입 탭에서는 제목이 "수입"이고 예산등록·내역등록 버튼을 type=INCOME으로 보여준다', () => {
    pathname = '/finance/income'
    render(<FinanceHeader />)

    expect(screen.getByRole('heading', { name: '수입' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '예산 등록 (INCOME)' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '내역 등록 (INCOME)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '수입' })).toHaveAttribute('aria-current', 'page')
  })

  it('설정 탭에서는 제목이 "설정"이고 어떤 등록 버튼도 보여주지 않는다', () => {
    pathname = '/finance/settings'
    render(<FinanceHeader />)

    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '자산 등록' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /예산 등록/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /내역 등록/ })).not.toBeInTheDocument()
  })

  it('탭은 자산·수입·소비·저축·설정 순서로 배치된다', () => {
    pathname = '/finance'
    render(<FinanceHeader />)

    const group = screen.getByRole('group', { name: '가계부 탭' })
    const labels = Array.from(group.querySelectorAll('a')).map((el) => el.textContent)

    expect(labels).toEqual(['자산', '수입', '소비', '저축', '설정'])
  })
})
