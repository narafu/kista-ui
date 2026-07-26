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

vi.mock('@entities/meta', () => ({
  MetaProvider: ({ children }: { children: React.ReactNode }) => children,
  getMetaBundle: vi.fn().mockResolvedValue({}),
}))

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: vi.fn().mockResolvedValue('token'),
}))

describe('AdminLayout', () => {
  it('renders pull-to-refresh for admin pages', async () => {
    const layout = await AdminLayout({ children: <div>admin content</div> })
    render(layout)

    expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument()
  })
})
