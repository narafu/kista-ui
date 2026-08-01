import { KISTA_TOKEN_COOKIE } from './cookies'

// 서버 컴포넌트 / Route Handler 전용 (next/headers)
export async function getAuthToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return cookieStore.get(KISTA_TOKEN_COOKIE)?.value
}
