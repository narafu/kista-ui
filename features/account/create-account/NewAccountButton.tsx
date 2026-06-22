'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'

interface Props {
  href?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

export function NewAccountButton({ href = '/accounts/new', className, style, children = '계좌 등록' }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  function handleClick() {
    if (isLoading) return
    setIsLoading(true)
    router.push(href)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className={className}
      style={style}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          등록 중...
        </>
      ) : (
        <>
          <Plus className="size-4" />
          {children}
        </>
      )}
    </button>
  )
}
