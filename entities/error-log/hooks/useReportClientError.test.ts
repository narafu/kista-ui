import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useReportClientError } from './useReportClientError'

const { reportClientErrorMock } = vi.hoisted(() => ({ reportClientErrorMock: vi.fn() }))

vi.mock('../api', () => ({ reportClientError: reportClientErrorMock }))

describe('useReportClientError', () => {
  it('truncates fields to kista-api size limits so the report is not rejected', () => {
    const error = new Error('m'.repeat(3000))
    error.stack = 's'.repeat(9000)

    renderHook(() => useReportClientError(error, '/stats'))

    const input = reportClientErrorMock.mock.calls[0][0]
    expect(input.message).toHaveLength(2000)
    expect(input.stackTrace).toHaveLength(8000)
    expect(input.context).toEqual({ pathname: '/stats' })
  })
})
