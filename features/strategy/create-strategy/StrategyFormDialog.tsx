'use client'

import { useEffect, useState } from 'react'
import { cn } from '@shared/lib/utils'
import { buttonVariants } from '@/components/ui/button'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const triggerClass = cn(
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
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="overflow-hidden sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="min-w-0 w-full max-h-[70vh] overflow-x-hidden overflow-y-auto overscroll-contain">
          {form}
        </div>
      </DialogContent>
    </Dialog>
  )
}
