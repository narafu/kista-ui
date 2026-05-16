'use client'

import { useState, useEffect, useRef } from 'react'

const SECTIONS = [
  { id: 'profile',   label: '프로필' },
  { id: 'prefs',     label: '환경 설정' },
  { id: 'telegram',  label: '텔레그램 알림' },
  { id: 'accounts',  label: '계좌별 알림' },
]

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

  function go(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - 80
    window.scrollTo({ top, behavior: 'smooth' })
  }

  return (
    <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, position: 'sticky', top: 24 }}>
      {SECTIONS.map((it) => {
        const on = active === it.id
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            onClick={(e) => { e.preventDefault(); go(it.id) }}
            style={{
              padding: '9px 12px',
              borderRadius: 7,
              fontSize: 13.5,
              fontWeight: 600,
              color: on ? 'var(--rose-600)' : 'var(--muted-foreground)',
              background: on ? 'var(--rose-50)' : 'transparent',
              textDecoration: 'none',
              transition: 'background .15s, color .15s',
            }}
          >
            {it.label}
          </a>
        )
      })}
    </nav>
  )
}
