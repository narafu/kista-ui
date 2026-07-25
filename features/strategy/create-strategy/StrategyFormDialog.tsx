'use client'

import { useSyncExternalStore, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button-variants'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer'
import { StrategyForm } from './StrategyForm'
import type { Strategy } from '@entities/strategy'

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
  const isMobile = useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia('(max-width: 1023px)')
      mq.addEventListener('change', cb)
      return () => mq.removeEventListener('change', cb)
    },
    () => window.matchMedia('(max-width: 1023px)').matches,
    () => false,
  )

  const triggerClass = triggerVariant === 'default'
    ? cn(
        'inline-flex items-center gap-1.5 h-8 px-3 rounded-md',
        'bg-gradient-to-br from-rose-500 to-rose-700 text-white text-xs font-semibold',
        'shadow-[0_1px_4px_rgba(225,29,72,0.30)] hover:opacity-90 transition-opacity',
        disabled && 'opacity-40 pointer-events-none',
      )
    : cn(
        buttonVariants({ variant: triggerVariant, size: 'sm' }),
        disabled && 'opacity-40 pointer-events-none',
      )

  const title = initial ? '전략 수정' : '전략 등록'
  const description = initial
    ? '전략 설정을 변경합니다.'
    : '이 계좌에 적용할 매매 전략을 등록합니다.'

  const form = (
    <StrategyForm
      accountId={accountId}
      initial={initial}
      onSuccess={() => setOpen(false)}
      onCancel={() => setOpen(false)}
    />
  )

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} direction="bottom">
        <DrawerTrigger className={triggerClass} disabled={disabled}>
          {triggerVariant === 'default' && <Plus className="size-3.5" />}
          {triggerLabel}
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="min-w-0 w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-4">
            {form}
          </div>
        </DrawerContent>
      </Drawer>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        className={triggerClass}
        disabled={disabled}
      >
        {triggerVariant === 'default' && <Plus className="size-3.5" />}
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="w-full max-h-[70vh] overflow-y-auto overscroll-contain pr-3">
          {form}
        </div>
      </DialogContent>
    </Dialog>
  )
}
