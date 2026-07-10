import { render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DashboardLogoutErrorToast } from './DashboardLogoutErrorToast'

const { replaceMock, toastErrorMock, useSearchParamsMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  toastErrorMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock }),
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('sonner', () => ({
  toast: { error: toastErrorMock },
}))

describe('DashboardLogoutErrorToast', () => {
  beforeEach(() => {
    replaceMock.mockClear()
    toastErrorMock.mockClear()
    useSearchParamsMock.mockReturnValue(new URLSearchParams())
  })

  it('error=token_blacklisted면 해당 메시지로 toast.error 호출 후 /dashboard로 쿼리를 정리한다', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=token_blacklisted'))
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).toHaveBeenCalledWith('로그아웃된 토큰입니다. 다시 로그인해 주세요.')
    expect(replaceMock).toHaveBeenCalledWith('/dashboard')
  })

  it('알 수 없는 error 값이면 일반 세션 만료 메시지로 toast.error 호출한다', () => {
    useSearchParamsMock.mockReturnValue(new URLSearchParams('error=weird_reason'))
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).toHaveBeenCalledWith('세션이 만료되어 로그아웃되었습니다. 다시 로그인해 주세요.')
  })

  it('error 쿼리가 없으면 toast나 라우팅을 호출하지 않는다', () => {
    render(<DashboardLogoutErrorToast />)

    expect(toastErrorMock).not.toHaveBeenCalled()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})
