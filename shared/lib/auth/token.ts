import { notFound } from 'next/navigation'
import { KISTA_TOKEN_COOKIE } from './cookies'

// 서버 컴포넌트 / Route Handler 전용 (next/headers)
export async function getAuthToken(): Promise<string | undefined> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return cookieStore.get(KISTA_TOKEN_COOKIE)?.value
}

// dynamic route params(`{ id }` 등)와 인증 토큰을 함께 기다린 뒤 토큰 없으면 notFound()로
// 중단한다 — 여러 Server Component page.tsx가 반복하던 `Promise.all([params, getAuthToken()])`
// + `if (!token) return notFound()` 가드를 통합한다.
export async function requirePageToken<T>(params: Promise<T>): Promise<{ params: T; token: string }> {
  const [resolvedParams, token] = await Promise.all([params, getAuthToken()])
  if (!token) return notFound()
  return { params: resolvedParams, token }
}
