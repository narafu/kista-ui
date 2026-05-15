const KISTA_TOKEN_COOKIE = 'kista-token'

// 서버 컴포넌트 / Route Handler 전용 (next/headers)
export async function getAuthToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return cookieStore.get(KISTA_TOKEN_COOKIE)?.value
}

// 클라이언트 컴포넌트 전용 (document.cookie 파싱)
// kista-token은 httpOnly: false이므로 클라이언트 JS에서 접근 가능
export function getAuthTokenClient(): string | undefined {
  if (typeof document === 'undefined') return undefined
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${KISTA_TOKEN_COOKIE}=([^;]*)`)
  )
  return match ? decodeURIComponent(match[1]) : undefined
}
