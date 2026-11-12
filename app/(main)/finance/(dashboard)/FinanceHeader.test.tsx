import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@testing/renderApp'
import { FinanceHeader } from './FinanceHeader'

// usePathname 전역 대역은 window.location.pathname을 읽는다
function renderAt(pathname: string) {
  window.history.replaceState(null, '', pathname)
  return renderApp(<FinanceHeader />)
}

describe('FinanceHeader', () => {
  it('자산 탭에서는 제목이 "자산"이고 자산 기록 등록 버튼만 보여준다', () => {
    renderAt('/finance')

    expect(screen.getByRole('heading', { name: '자산' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /자산 기록 등록/ })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /예산 관리/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '자산' })).toHaveAttribute('aria-current', 'page')
  })

  it('수입 탭에서는 제목이 "수입"이고 예산 관리 링크와 거래내역 등록 버튼을 보여준다', () => {
    renderAt('/finance/income')

    expect(screen.getByRole('heading', { name: '수입' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '예산 관리' })).toHaveAttribute('href', '/finance/budgets/income')
    expect(screen.getByRole('button', { name: '거래내역 등록' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /자산 기록 등록/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '수입' })).toHaveAttribute('aria-current', 'page')
  })

  it('설정 탭에서는 제목이 "설정"이고 어떤 등록 버튼도 보여주지 않는다', () => {
    renderAt('/finance/settings')

    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /자산 기록 등록/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /예산 관리/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /거래내역 등록/ })).not.toBeInTheDocument()
  })

  it('탭은 자산·수입·소비·저축·설정 순서로 배치된다', () => {
    renderAt('/finance')

    const nav = screen.getByRole('navigation', { name: '가계부 탭' })
    const labels = Array.from(nav.querySelectorAll('a')).map((el) => el.textContent)

    expect(labels).toEqual(['자산', '수입', '소비', '저축', '설정'])
  })
})
