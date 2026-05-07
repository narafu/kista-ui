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
