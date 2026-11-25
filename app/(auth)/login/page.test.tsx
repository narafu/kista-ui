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
  // eslint-disable-next-line @next/next/no-img-element -- 테스트용 next/image mock
  default: ({ alt, ...props }: React.ComponentProps<'img'>) => <img alt={alt} {...props} />,
}))

const getMetaBundleMock = vi.fn()
vi.mock('@entities/meta', () => ({
  getMetaBundle: () => getMetaBundleMock(),
}))

function stubSearchParams(query: Record<string, string>) {
  useSearchParamsMock.mockReturnValue(new URLSearchParams(query))
}

describe('LoginPage 카카오 로그인 next 파라미터', () => {
  const originalClientId = process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID

  beforeEach(() => {
    getMetaBundleMock.mockResolvedValue({ approvalRequired: false })
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID = 'test-client-id'
    Object.defineProperty(window, 'location', { value: { href: '', origin: 'http://localhost:3000' }, writable: true })
  })

  afterEach(() => {
    process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID = originalClientId
    vi.clearAllMocks()
  })

  it('안전한 next가 있으면 카카오 OAuth state 파라미터에 실어 보낸다', async () => {
    stubSearchParams({ next: '/accounts/new' })
    render(await LoginPage())

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.get('state')).toBe('/accounts/new')
  })

  it('외부 도메인을 가리키는 next는 오픈 리다이렉트로 악용되지 못하고 state에서 빠진다', async () => {
    stubSearchParams({ next: 'https://evil.com' })
    render(await LoginPage())

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.has('state')).toBe(false)
  })

  it('next가 없으면 state 파라미터를 붙이지 않는다', async () => {
    stubSearchParams({})
    render(await LoginPage())

    await userEvent.click(screen.getByRole('button', { name: /카카오로 시작하기/ }))

    const url = new URL(window.location.href)
    expect(url.searchParams.has('state')).toBe(false)
  })
})

describe('LoginPage 가입 승인 안내', () => {
  beforeEach(() => stubSearchParams({}))

  it('meta.approvalRequired가 true일 때만 승인 안내를 보인다', async () => {
    getMetaBundleMock.mockResolvedValueOnce({ approvalRequired: false })
    const { unmount } = render(await LoginPage())
    expect(screen.queryByText('가입 후 관리자 승인이 필요합니다.')).not.toBeInTheDocument()
    unmount()

    getMetaBundleMock.mockResolvedValueOnce({ approvalRequired: true })
    render(await LoginPage())
    expect(screen.getByText('가입 후 관리자 승인이 필요합니다.')).toBeInTheDocument()
  })

  it('meta 조회가 실패하면 승인이 필요하다고 단정하지 않고 페이지는 그대로 뜬다', async () => {
    getMetaBundleMock.mockRejectedValueOnce(new Error('down'))
    render(await LoginPage())
    expect(screen.queryByText(/관리자 승인/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /카카오로 시작하기/ })).toBeInTheDocument()
  })
})
