import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AdminLayout from './layout'

vi.mock('@widgets/layout/AdminSidebar', () => ({
  AdminSidebar: () => <aside data-testid='admin-sidebar' />,
}))

vi.mock('@widgets/layout/AdminTopBar', () => ({
  AdminTopBar: () => <header data-testid='admin-top-bar' />,
}))

vi.mock('@widgets/pull-to-refresh', () => ({
  PullToRefresh: () => <div data-testid='pull-to-refresh' />,
}))

vi.mock('sonner', () => ({
  Toaster: () => <div data-testid='toaster' />,
}))

describe('AdminLayout', () => {
  it('renders pull-to-refresh for admin pages', () => {
    render(
      <AdminLayout>
        <div>admin content</div>
      </AdminLayout>,
    )

    expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument()
  })
})
