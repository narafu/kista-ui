'use client'

import { useRef, useState, type ReactNode } from 'react'
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
  // 열림마다 회차를 매기고 close는 렌더 시점 회차를 잡는다. 이미 닫힌 회차의 close는 무시한다 —
  // 연타(popstate 전 두 번째 close), 뒤로 가기로 닫힌 뒤 늦게 끝난 mutation의 onDone, 다시 연 다이얼로그에
  // 도착한 이전 회차의 onDone이 history.back()을 한 번 더 불러 화면을 떠나지 않게
  const [session, setSession] = useState(open ? 1 : 0)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) setSession((s) => s + 1)
  }
  const closedSession = useRef(0)
  const { leave } = useSubviewHistory(open, () => {
    closedSession.current = session
    onOpenChange(false)
  })
  const close = () => {
    if (closedSession.current >= session) return
    closedSession.current = session
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
