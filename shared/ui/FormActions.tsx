import Link from 'next/link'
import { cn } from '@shared/lib/utils'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Spinner } from './Spinner'

interface Props {
  // 취소를 onClick 콜백(다이얼로그 닫기 등)으로 처리하면 onCancel, 다른 페이지로 이동(Link)해야
  // 하면 cancelHref를 준다 — 둘 다 없으면 취소 버튼 없이 제출 버튼만 렌더한다.
  onCancel?: () => void
  cancelHref?: string
  isPending: boolean
  canSubmit: boolean
  label: string
  pendingLabel?: string
  // 되돌릴 수 없는 작업(VR 재설정 등)은 destructive로 위계를 표시한다
  submitVariant?: 'default' | 'destructive'
  className?: string
}

// 폼 맨 끝에 놓이는 취소(outline) + 제출(spinner) 버튼 행 — 모바일·PC 모두 화면에 띄우지(fixed) 않고
// 콘텐츠 흐름 안에 둔다. AssetForm·StrategyForm·EditAccountForm·ReconfigureVrForm이 공유한다.
export function FormActions({ onCancel, cancelHref, isPending, canSubmit, label, pendingLabel = '저장 중...', submitVariant = 'default', className }: Props) {
  const cancelClassName = cn(buttonVariants({ variant: 'outline', size: 'form' }), 'flex-1')
  return (
    <div className={cn('flex gap-3', className)}>
      {cancelHref ? (
        <Link href={cancelHref} className={cancelClassName}>취소</Link>
      ) : onCancel ? (
        <button type="button" onClick={onCancel} disabled={isPending} className={cancelClassName}>
          취소
        </button>
      ) : null}
      <Button type="submit" variant={submitVariant} size="form" className="flex-1" disabled={isPending || !canSubmit}>
        {isPending ? (
          <>
            <Spinner size={14} />
            {pendingLabel}
          </>
        ) : label}
      </Button>
    </div>
  )
}
