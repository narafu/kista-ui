import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const KISTA_TOKEN_COOKIE = 'kista-token'

// "/"는 인증 분기 후 리다이렉트 — 인증 시 대시보드, 비인증 시 로그인 (감사 A-01·S-01)
export default async function RootPage() {
  const cookieStore = await cookies()
  const token = cookieStore.get(KISTA_TOKEN_COOKIE)?.value
  redirect(token ? '/dashboard' : '/login')
}
