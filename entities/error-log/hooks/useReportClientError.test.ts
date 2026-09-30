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

  it('truncates errorType and drops a dangling high surrogate at the cut', () => {
    const error = new Error()
    error.name = 'E'.repeat(254) + '😀'
    error.stack = undefined

    renderHook(() => useReportClientError(error, null))

    const input = reportClientErrorMock.mock.calls.at(-1)?.[0]
    expect(input.errorType).toBe('E'.repeat(254))
    expect(input.stackTrace).toBeUndefined()
    expect(input.context).toEqual({ pathname: '' })
  })
})
