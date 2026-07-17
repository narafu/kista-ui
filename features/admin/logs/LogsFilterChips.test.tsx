import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LogsFilterChips } from './LogsFilterChips'

let mockSearchParams = new URLSearchParams()

vi.mock('next/navigation', () => ({
  useSearchParams: () => mockSearchParams,
}))

describe('LogsFilterChips', () => {
  it('links "전체" back to the base path without a type query param', () => {
    mockSearchParams = new URLSearchParams('type=error')
    render(<LogsFilterChips />)

    expect(screen.getByRole('link', { name: '전체' })).toHaveAttribute('href', '/admin/logs')
    expect(screen.getByRole('link', { name: '오류 로그' })).toHaveAttribute('href', '/admin/logs?type=error')
  })

  it('preserves other query params (e.g. errRange) when linking to a different filter', () => {
    mockSearchParams = new URLSearchParams('type=all&errRange=7d&errSize=20')
    render(<LogsFilterChips />)

    const href = screen.getByRole('link', { name: '오류 로그' }).getAttribute('href')
    expect(href).toContain('type=error')
    expect(href).toContain('errRange=7d')
    expect(href).toContain('errSize=20')
  })

  it('omits the type param entirely when linking back to "전체"', () => {
    mockSearchParams = new URLSearchParams('type=anomaly&anoRange=30d')
    render(<LogsFilterChips />)

    const href = screen.getByRole('link', { name: '전체' }).getAttribute('href')
    expect(href).toBe('/admin/logs?anoRange=30d')
  })
})
