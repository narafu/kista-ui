'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useSubviewHistory } from '@shared/lib/subviewHistory'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: ReactNode
  // 폼은 받은 close로만 닫는다(취소·제출 성공). onOpenChange(false)를 직접 부르면 열 때 쌓은 이력 칸이 남는다
  children: (close: () => void) => ReactNode
}

// 작은 폼 공용 셸 — PC(sm 이상)는 가운데 다이얼로그, 모바일은 전체 화면 시트.
// 열 때 이력 한 칸을 쌓아 모바일 뒤로 가기가 화면을 떠나지 않고 폼만 닫는다. X·ESC·배경·close가 모두
// history.back()을 거쳐 popstate에서 닫히므로 닫는 경로가 하나다. 본문은 닫혀 있는 동안 unmount돼 열 때마다 초기값이 새로 잡힌다.
export function FormDialog({ open, onOpenChange, title, description, children }: Props) {
  // history.back()의 popstate는 비동기다 — 그 사이 닫기가 또 불리면(연타) 두 칸을 되돌아간다
  const leaving = useRef(false)
  const { leave } = useSubviewHistory(open, () => onOpenChange(false))
  // popstate 없이 닫힌 경우(부모가 직접 닫음)에도 다음 열림에서 닫기가 막히지 않게 열 때마다 푼다
  useEffect(() => {
    if (open) leaving.current = false
  }, [open])
  const close = () => {
    if (leaving.current) return
    leaving.current = true
    leave()
  }
  return (
    <Dialog open={open} onOpenChange={(next) => { if (next) onOpenChange(true); else close() }}>
      <DialogContent className="top-0 left-0 h-dvh max-w-none translate-x-0 translate-y-0 content-start overflow-y-auto rounded-none pb-[max(1rem,env(safe-area-inset-bottom))] sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children(close)}
      </DialogContent>
    </Dialog>
  )
}
