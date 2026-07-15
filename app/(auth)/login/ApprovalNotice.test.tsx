import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ApprovalNotice } from './ApprovalNotice'

const useRuntimeConfigQueryMock = vi.fn()
vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => useRuntimeConfigQueryMock(),
}))

describe('ApprovalNotice', () => {
  it('shows approval copy only when approval is required', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: { auth: { approvalRequired: false } } })
    const { rerender } = render(<ApprovalNotice />)
    expect(screen.queryByText('가입 후 관리자 승인이 필요합니다.')).not.toBeInTheDocument()

    useRuntimeConfigQueryMock.mockReturnValue({ data: { auth: { approvalRequired: true } } })
    rerender(<ApprovalNotice />)
    expect(screen.getByText('가입 후 관리자 승인이 필요합니다.')).toBeInTheDocument()
  })

  it('does not imply approval while settings are unavailable', () => {
    useRuntimeConfigQueryMock.mockReturnValue({ data: undefined })
    render(<ApprovalNotice />)
    expect(screen.queryByText(/관리자 승인/)).not.toBeInTheDocument()
  })
})
