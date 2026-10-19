'use client'

import { useState } from 'react'
import { clientFetch } from '@shared/lib/api-client'
import { buttonVariants } from '@/components/ui/button-variants'

interface Props {
  className?: string
  children?: React.ReactNode
  'aria-label'?: string
}

export function LogoutButton({ className, children, 'aria-label': ariaLabel }: Props) {
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
      aria-label={ariaLabel}
      className={className ?? buttonVariants({ variant: 'outline', size: 'sm' })}
    >
      {children ?? (isLoading ? '로그아웃 중...' : '로그아웃')}
    </button>
  )
}
