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

  // 호출부가 className으로 형태 전체를 정한다(사이드바 nav 행·헤더 아이콘 링크 클래스 등) — 공용 Button은
  // buttonVariants 기본(h-8·bg-primary)을 항상 병합해 그 형태가 깨지므로 raw button. 미지정 시만 outline sm
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
