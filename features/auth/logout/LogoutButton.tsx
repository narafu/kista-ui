'use client'

import { useState } from 'react'
import { clientFetch } from '@shared/lib/api-client'

interface Props {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: Props) {
  const [isLoading, setIsLoading] = useState(false)

  async function handleLogout() {
    if (isLoading) return
    setIsLoading(true)
    await clientFetch<void>('/api/auth/logout', { method: 'POST' }).catch(() => {})
    window.location.href = '/dashboard'
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={className ?? 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-semibold bg-transparent border border-border text-muted-foreground cursor-pointer hover:bg-accent transition-colors disabled:opacity-60'}
    >
      {children ?? (isLoading ? '로그아웃 중...' : '로그아웃')}
    </button>
  )
}
