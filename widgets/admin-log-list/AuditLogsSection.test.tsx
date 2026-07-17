import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AdminAuditLog } from '@entities/admin'
import { AuditLogsSection } from './AuditLogsSection'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin/logs',
  useSearchParams: () => new URLSearchParams(),
}))

const logWithPayload: AdminAuditLog = {
  id: 'log-1',
  adminId: 'admin-12345678',
  action: 'APPROVE_USER',
  targetType: 'USER',
  targetId: 'user-12345678',
  payload: { reason: 'ok' },
  createdAt: '2026-07-01T09:00:00Z',
}

const logWithoutPayload: AdminAuditLog = {
  id: 'log-2',
  adminId: 'admin-2',
  action: 'REJECT_USER',
  targetType: null,
  targetId: null,
  payload: null,
  createdAt: '2026-07-01T10:00:00Z',
}

describe('AuditLogsSection', () => {
  it('shows an empty state when there are no logs', () => {
    render(<AuditLogsSection logs={[]} total={0} page={1} totalPages={1} size={10} range="7d" />)

    expect(screen.getByText('관리자 로그가 없습니다')).toBeInTheDocument()
  })

  it('renders the payload JSON block only for logs that have a non-empty payload', () => {
    render(
      <AuditLogsSection
        logs={[logWithPayload, logWithoutPayload]}
        total={2}
        page={1}
        totalPages={1}
        size={10}
        range="7d"
      />,
    )

    expect(screen.getByText(/"reason": "ok"/)).toBeInTheDocument()
    expect(screen.getByText('APPROVE_USER')).toBeInTheDocument()
    expect(screen.getByText('REJECT_USER')).toBeInTheDocument()
  })

  it('shows the targetType label only when targetType is present', () => {
    render(
      <AuditLogsSection
        logs={[logWithPayload, logWithoutPayload]}
        total={2}
        page={1}
        totalPages={1}
        size={10}
        range="7d"
      />,
    )

    expect(screen.getByText(/^USER/)).toBeInTheDocument()
  })
})
