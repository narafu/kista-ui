'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'

interface Props {
  size?: 'sm' | 'md'
}

export function ThemeToggle({ size = 'md' }: Props) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  const h = size === 'sm' ? 28 : 32

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 2,
        borderRadius: 999,
        background: 'var(--muted)',
        boxShadow: 'inset 0 0 0 1px var(--border)',
        height: h + 4,
        cursor: 'pointer',
      }}
    >
      {[
        { key: 'light', Icon: Sun },
        { key: 'dark', Icon: Moon },
      ].map(({ key, Icon }) => {
        const on = (key === 'dark') === isDark
        return (
          <span
            key={key}
            onClick={() => setTheme(key)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              height: h,
              padding: size === 'sm' ? '0 9px' : '0 11px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: on ? 'var(--card)' : 'transparent',
              color: on ? 'var(--rose-400, #CB836A)' : 'var(--muted-foreground)',
              boxShadow: on ? '0 1px 3px rgba(0,0,0,.10)' : 'none',
              transition: 'background .15s, color .15s',
            }}
          >
            <Icon size={size === 'sm' ? 12 : 14} />
            {size === 'md' && (key === 'light' ? '라이트' : '다크')}
          </span>
        )
      })}
    </div>
  )
}
