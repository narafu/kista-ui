import { Button } from '@/components/ui/button'
import { Spinner } from '@shared/ui/Spinner'

/** 폼 다이얼로그의 제출 버튼 공용 형태 — 저장 중 스피너 표시. */
export function SaveButton({ isPending, disabled, label = '저장' }: { isPending: boolean; disabled?: boolean; label?: string }) {
  return (
    <Button type="submit" disabled={isPending || disabled} className="gap-2">
      {isPending ? (
        <>
          <Spinner size={14} />
          {label} 중...
        </>
      ) : (
        label
      )}
    </Button>
  )
}
