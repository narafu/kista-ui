'use client'

import { useRouter } from 'next/navigation'
import { clientFetch } from '@shared/lib/api-client'

interface Props {
  className?: string
  children?: React.ReactNode
}

export function LogoutButton({ className, children }: Props) {
  const router = useRouter()

  async function handleLogout() {
    await clientFetch<void>('/api/auth/logout', { method: 'POST' }).catch(() => {})
    router.push('/')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={className ?? 'inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-semibold bg-transparent border border-border text-muted-foreground cursor-pointer hover:bg-accent transition-colors'}
    >
      {children ?? '로그아웃'}
    </button>
  )
}
