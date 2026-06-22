'use client'

import { useState, useEffect } from 'react'
import { cn } from '@shared/lib/utils'

const SECTIONS = [
  { id: 'profile',       label: '프로필' },
  { id: 'notifications', label: '알림' },
  { id: 'security',      label: '보안' },
  { id: 'preferences',   label: '환경설정' },
  { id: 'danger',        label: '계정' },
]

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - 80
  window.scrollTo({ top, behavior: 'smooth' })
}

export function SettingsNav() {
  const [active, setActive] = useState('profile')

  useEffect(() => {
    function onScroll() {
      const offset = 100
      let cur = SECTIONS[0].id
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id)
        if (!el) continue
        if (el.getBoundingClientRect().top - offset <= 0) cur = s.id
      }
      setActive(cur)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <nav className="sticky top-24 flex flex-col gap-1">
      {SECTIONS.map((it) => {
        const on = active === it.id
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => scrollTo(it.id)}
            className={cn(
              'px-3 py-2 rounded-[var(--r-md)] text-[13.5px] font-semibold transition-colors duration-150 text-left w-full',
              on
                ? 'text-[var(--brand-fg-soft)] bg-[var(--brand-soft-bg)]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
            )}
          >
            {it.label}
          </button>
        )
      })}
    </nav>
  )
}
