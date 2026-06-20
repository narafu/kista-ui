'use client'

import { useSyncExternalStore } from 'react'
import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { cn } from '@shared/lib/utils'

export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(() => () => {}, () => true, () => false)
  const isDark = mounted && resolvedTheme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label="테마 전환"
      className={cn(
        'relative flex items-center w-11 h-6 rounded-full border border-border transition-colors cursor-pointer',
        isDark ? 'bg-rose-600' : 'bg-muted',
        className,
      )}
    >
      <span
        className={cn(
          'absolute size-[18px] rounded-full bg-white shadow-sm flex items-center justify-center transition-transform duration-200',
          isDark ? 'translate-x-[22px]' : 'translate-x-[2px]',
        )}
      >
        {isDark
          ? <Moon className="size-2.5 text-rose-600" />
          : <Sun className="size-2.5 text-amber-500" />
        }
      </span>
    </button>
  )
}
