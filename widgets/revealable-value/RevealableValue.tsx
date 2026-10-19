'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { IconButton } from '@shared/ui/IconButton'

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
      <IconButton
        onClick={(e) => { e.stopPropagation(); setRevealed((v) => !v) }}
        className="-m-3.5 shrink-0 hover:bg-transparent"
        aria-label={revealed ? '숨기기' : '보기'}
      >
        {revealed
          ? <EyeOff className="size-4" />
          : <Eye className="size-4" />
        }
      </IconButton>
    </span>
  )
}
