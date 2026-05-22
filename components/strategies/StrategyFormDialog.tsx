'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { StrategyForm } from './StrategyForm'
import type { Strategy } from '@/types/strategy'

interface Props {
  accountId: string
  initial?: Strategy
  triggerLabel?: string
  triggerVariant?: 'default' | 'outline' | 'ghost'
  disabled?: boolean
}

export function StrategyFormDialog({
  accountId,
  initial,
  triggerLabel = '전략 추가',
  triggerVariant = 'default',
  disabled = false,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={cn(
          buttonVariants({ variant: triggerVariant, size: 'sm' }),
          disabled && 'opacity-40 pointer-events-none',
        )}
        disabled={disabled}
      >
        {triggerLabel}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initial ? '전략 수정' : '전략 등록'}</DialogTitle>
          <DialogDescription>
            {initial ? '전략 설정을 변경합니다.' : '이 계좌에 적용할 매매 전략을 등록합니다.'}
          </DialogDescription>
        </DialogHeader>
        <StrategyForm
          accountId={accountId}
          initial={initial}
          onSuccess={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
