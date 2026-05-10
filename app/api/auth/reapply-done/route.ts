import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const STATUS_COOKIE = 'kista-user-status'

export async function POST() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )

  // 인증 확인: getUser()로 서버 검증
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // access_token 취득: 인증 확인 후 session 조회
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  try {
    const res = await fetch(`${apiUrl}/api/auth/reapply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[reapply-done] kista-api ${res.status}: ${body}`)
      return NextResponse.json(
        { error: 'Reapply failed' },
        { status: res.status }
      )
    }

    // status 쿠키 삭제 → middleware 느린 경로로 PENDING 쿠키 재설정
    const response = NextResponse.json({ success: true })
    response.cookies.set(STATUS_COOKIE, '', { maxAge: 0, path: '/' })

    return response
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
