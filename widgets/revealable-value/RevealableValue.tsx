'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface Props {
  value: string
  hiddenDisplay?: string
  className?: string
}

export function RevealableValue({ value, hiddenDisplay = '••••••••', className }: Props) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <span className="font-mono tracking-wider">{revealed ? value : hiddenDisplay}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setRevealed((v) => !v) }}
        className="-m-2 p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
        aria-label={revealed ? '숨기기' : '보기'}
      >
        {revealed
          ? <EyeOff className="size-4" />
          : <Eye className="size-4" />
        }
      </button>
    </span>
  )
}
