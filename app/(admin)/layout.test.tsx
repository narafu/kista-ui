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
  MetaProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  getMetaBundle: vi.fn().mockResolvedValue({}),
}))

vi.mock('@shared/lib/auth/token', () => ({
  getAuthToken: vi.fn().mockResolvedValue(null),
}))

describe('AdminLayout', () => {
  it('renders pull-to-refresh for admin pages', async () => {
    // AdminLayout은 async Server Component라 RTL의 render()가 직접 다루지 못한다 —
    // 컴포넌트 호출을 먼저 await해 반환된 엘리먼트를 render()에 넘긴다.
    const ui = await AdminLayout({ children: <div>admin content</div> })
    render(ui)

    expect(screen.getByTestId('pull-to-refresh')).toBeInTheDocument()
  })
})
