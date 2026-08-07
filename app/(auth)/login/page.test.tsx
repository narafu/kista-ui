import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import LoginPage from './page'

const { useSearchParamsMock } = vi.hoisted(() => ({
  useSearchParamsMock: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}))

vi.mock('next/image', () => ({
  default: (props: React.ComponentProps<'img'>) => <img {...props} />,
}))

vi.mock('@entities/runtime-config', () => ({
  useRuntimeConfigQuery: () => ({ data: { auth: { approvalRequired: false } } }),
}))

function stubSearchParams(query: Record<string, string>) {
  useSearchParamsMock.mockReturnValue(new URLSearchParams(query))
}

describe('LoginPage 카카오 로그인 next 파라미터', () => {
  const originalClientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID

  beforeEach(() => {
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID = 'test-client-id'
    Object.defineProperty(window, 'location', { value: { href: '', origin: 'http://localhost:3000' }, writable: true })
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID = originalClientId
    vi.clearAllMocks()
  })

  it('안전한 next가 있으면 카카오 OAuth state 파라미터에 실어 보낸다', async () => {
    stubSearchParams({ next: '/accounts/new' })
    render(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.get('state')).toBe('/accounts/new')
  })

  it('외부 도메인을 가리키는 next는 오픈 리다이렉트로 악용되지 못하고 state에서 빠진다', async () => {
    stubSearchParams({ next: 'https://evil.com' })
    render(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.has('state')).toBe(false)
  })

  it('next가 없으면 state 파라미터를 붙이지 않는다', async () => {
    stubSearchParams({})
    render(<LoginPage />)

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.has('state')).toBe(false)
  })
})
