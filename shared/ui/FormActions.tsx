import Link from 'next/link'
import { cn } from '@shared/lib/utils'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Spinner } from './Spinner'

interface Props {
  // 취소를 onClick 콜백(다이얼로그 닫기 등)으로 처리하면 onCancel, 다른 페이지로 이동(Link)해야
  // 하면 cancelHref를 준다 — 정확히 하나만 전달한다.
  onCancel?: () => void
  cancelHref?: string
  isPending: boolean
  canSubmit: boolean
  label: string
  pendingLabel?: string
  /** md: 데스크탑 인라인 폼(h-12), lg: 모바일 고정 제출 바(h-14, 큰 글씨) */
  size: 'md' | 'lg'
}

const SIZE_CLS = { md: 'h-12', lg: 'h-14 text-base font-semibold' } as const
const SPINNER_SIZE = { md: 14, lg: 16 } as const

// 취소(outline) + 제출(spinner) 버튼 쌍 — AssetForm이 데스크탑 인라인 영역과 모바일 고정 바에서,
// EditAccountForm이 데스크탑 영역에서 높이·글자크기만 다르게 반복하던 동일 조합을 추출.
export function FormActions({ onCancel, cancelHref, isPending, canSubmit, label, pendingLabel = '저장 중...', size }: Props) {
  const cancelClassName = cn(buttonVariants({ variant: 'outline' }), 'flex-1', SIZE_CLS[size])
  return (
    <>
      {cancelHref ? (
        <Link href={cancelHref} className={cancelClassName}>취소</Link>
      ) : (
        <button type="button" onClick={onCancel} disabled={isPending} className={cancelClassName}>
          취소
        </button>
      )}
      <Button type="submit" className={cn('flex-1 gap-2', SIZE_CLS[size])} disabled={isPending || !canSubmit}>
        {isPending ? (
          <>
            <Spinner size={SPINNER_SIZE[size]} />
            {pendingLabel}
          </>
        ) : label}
      </Button>
    </>
  )
}
