'use client'

import { useEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'

/** useMutation 결과 중 이 다이얼로그가 쓰는 부분 */
interface ConfirmMutation<V> {
  isPending: boolean
  mutate: (variables: V, options?: { onSuccess?: () => void }) => void
}

interface CommonProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel?: string
  /** 기본값은 `confirmLabel + " 중…"` */
  pendingLabel?: string
  /** 확인 버튼 색. 삭제·연결 해제처럼 되돌릴 수 없는 동작이 기본이라 아닌 경우만 false */
  destructive?: boolean
  /** 주면 이 문자열을 그대로 입력해야 확인 버튼이 열린다 */
  typeToConfirm?: string
  size?: 'default' | 'sm'
  /**
   * 열기 버튼. 있으면 Base UI 트리거로 그려 `aria-haspopup`·`aria-expanded`·닫은 뒤 포커스 복귀를 얻는다.
   * 처리 중 차단은 `aria-disabled` + `onClick`의 `e.preventBaseUIHandler()`로 한다(`disabled`는 포커스를 잃는다)
   */
  trigger?: ReactElement
}

// 폼 안 확인 단계처럼 호출부가 제출·닫기를 직접 다룰 때
interface HandlerProps extends CommonProps {
  onConfirm: () => void
  pending: boolean
  mutation?: never
  variables?: never
  onSuccess?: never
}

// 버튼 하나로 끝나는 확인 — 진행 표시와 성공 후 닫기를 여기서 맡는다. 실패 토스트는 hook의 onError가 띄운다
interface MutationProps<V> extends CommonProps {
  mutation: ConfirmMutation<V>
  variables: V
  onSuccess?: () => void
  onConfirm?: never
  pending?: never
}

type Props<V> = HandlerProps | MutationProps<V>

export function ConfirmDialog<V = void>(props: Props<V>) {
  const { open, onOpenChange, title, description, confirmLabel = '삭제', destructive = true, typeToConfirm, size = 'sm', trigger } = props
  const pendingLabel = props.pendingLabel ?? `${confirmLabel} 중…`
  // 열림·닫힘마다 회차를 올려, 닫힌 뒤(또는 다시 연 뒤) 도착한 이전 회차의 성공이 새 다이얼로그를 닫지 못하게 한다
  const round = useRef(0)
  useEffect(() => {
    round.current += 1
  }, [open])

  const pending = props.mutation ? props.mutation.isPending : props.pending

  function handleConfirm() {
    if (!props.mutation) {
      props.onConfirm()
      return
    }
    const mine = ++round.current
    const { onSuccess } = props
    props.mutation.mutate(props.variables, {
      onSuccess: () => {
        onSuccess?.()
        if (round.current === mine) onOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => onOpenChange(next)}>
      {trigger && <AlertDialogTrigger render={trigger} />}
      <AlertDialogContent size={size}>
        <ConfirmBody
          title={title}
          description={description}
          confirmLabel={pending ? pendingLabel : confirmLabel}
          destructive={destructive}
          typeToConfirm={typeToConfirm}
          pending={pending}
          open={open}
          onConfirm={handleConfirm}
        />
      </AlertDialogContent>
    </AlertDialog>
  )
}

// 팝업이 닫히면 언마운트되므로 입력값이 다음 열림에 남지 않는다. 닫힘 애니메이션 중에는 확인을 다시 누를 수 없다(!open)
function ConfirmBody({
  title,
  description,
  confirmLabel,
  destructive,
  typeToConfirm,
  pending,
  open,
  onConfirm,
}: {
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  destructive: boolean
  typeToConfirm?: string
  pending: boolean
  open: boolean
  onConfirm: () => void
}) {
  const [typed, setTyped] = useState('')
  const blocked = typeToConfirm !== undefined && typed !== typeToConfirm

  return (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle>{title}</AlertDialogTitle>
        <AlertDialogDescription>{description}</AlertDialogDescription>
      </AlertDialogHeader>
      {typeToConfirm !== undefined && (
        <Input placeholder={typeToConfirm} value={typed} onChange={(e) => setTyped(e.target.value)} aria-label={`${typeToConfirm} 입력`} autoComplete="off" disabled={pending} className="h-11" />
      )}
      <AlertDialogFooter>
        <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
        <AlertDialogAction variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={pending || blocked || !open}>
          {confirmLabel}
        </AlertDialogAction>
      </AlertDialogFooter>
    </>
  )
}
