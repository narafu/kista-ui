'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <button
      onClick={handleLogout}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '6px 14px', borderRadius: 8,
        fontSize: 13, fontWeight: 600,
        background: 'transparent',
        color: 'var(--muted-foreground)',
        border: '1px solid var(--border)',
        cursor: 'pointer',
      }}
    >
      로그아웃
    </button>
  )
}
