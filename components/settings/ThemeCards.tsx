'use client'

import { useTheme } from 'next-themes'

const THEMES = [
  {
    key: 'light',
    label: '라이트',
    desc: '밝은 환경',
    bg: '#FBF6F1',
    card: '#fff',
    accent: '#B66951',
  },
  {
    key: 'dark',
    label: '다크',
    desc: '저조도 환경',
    bg: '#131416',
    card: '#1B1C1F',
    accent: '#C99780',
  },
  {
    key: 'system',
    label: '시스템 자동',
    desc: 'OS 설정 따름',
    bg: 'linear-gradient(90deg, #FBF6F1 0% 50%, #131416 50% 100%)',
    card: 'linear-gradient(90deg, #fff 0% 50%, #1B1C1F 50% 100%)',
    accent: '#B66951',
  },
]

export function ThemeCards() {
  const { theme, setTheme } = useTheme()

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {THEMES.map((o) => {
        const on = (theme ?? 'system') === o.key
        return (
          <div
            key={o.key}
            onClick={() => setTheme(o.key)}
            style={{
              padding: 12,
              borderRadius: 12,
              border: `2px solid ${on ? 'var(--rose-400)' : 'var(--border)'}`,
              background: 'var(--card)',
              cursor: 'pointer',
              transition: 'border-color .15s',
            }}
          >
            <div style={{
              height: 64,
              borderRadius: 8,
              background: o.bg,
              padding: 8,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              marginBottom: 10,
              border: '1px solid var(--border)',
            }}>
              <div style={{ height: 5, borderRadius: 2, background: o.card, width: '60%' }} />
              <div style={{ height: 16, borderRadius: 4, background: o.card }} />
              <div style={{ height: 4, borderRadius: 2, background: o.accent, width: '40%', marginTop: 'auto' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>{o.label}</div>
                <div style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>{o.desc}</div>
              </div>
              {on && (
                <span style={{
                  width: 16, height: 16, borderRadius: 999,
                  background: 'var(--rose-500)', color: '#fff',
                  display: 'grid', placeItems: 'center',
                  fontSize: 10,
                }}>✓</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
