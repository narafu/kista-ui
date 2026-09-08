import { Copy, Pencil, Share2, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { IconButton } from './IconButton'

interface Props {
  canShare: boolean
  hasGroupId: boolean
  onShare: () => void
  onUnshare: () => void
  sharePending: boolean
  unsharePending: boolean
  // 미전달 시 복제 버튼 자체를 렌더하지 않는다(계좌 목록처럼 복제 개념이 없는 리소스).
  onDuplicate?: () => void
  onEdit: () => void
  onDelete: () => void
  // true면 수정·삭제만 비활성화한다(시스템 카테고리처럼 서버가 403을 내는 대상) — 공유/귀속/복제는
  // 이 잠금과 무관해 영향받지 않는다.
  locked?: boolean
  // true면 공유·귀속·수정·삭제를 비활성화한다(마감된 달처럼 서버가 그 레코드의 변경을 전면 차단하는 대상).
  // 복제는 사용자가 폼에서 새 날짜를 고르는 신규 생성이라 이 잠금과 무관해 영향받지 않는다.
  readOnly?: boolean
  // locked/readOnly로 비활성화된 버튼에 붙는 tooltip.
  lockTitle?: string
}

/**
 * 공유/귀속(조건부) → 복제(선택) → 수정 → 삭제 순서의 공용 행 작업 버튼 세트.
 * 거래내역·예산·계좌·카테고리 목록이 동일한 조합을 재사용한다 — Link 기반 복제/수정(자산 기록)은
 * 라우팅 방식이 달라 이 컴포넌트를 쓰지 않고 각자 구현을 유지한다.
 */
export function ShareableRowActions({
  canShare, hasGroupId, onShare, onUnshare, sharePending, unsharePending, onDuplicate, onEdit, onDelete,
  locked = false, readOnly = false, lockTitle,
}: Props) {
  const editDisabled = locked || readOnly
  // disabled 버튼이라 클릭은 이미 막힌다 — opacity만 낮추고 pointer-events는 남겨 hover 시 title(tooltip)이 뜨게 한다.
  const dimmed = 'opacity-40'
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canShare && !hasGroupId && (
        <IconButton aria-label="공유" onClick={onShare} disabled={sharePending || readOnly} title={readOnly ? lockTitle : undefined} className={cn(readOnly && dimmed)}>
          <Share2 className="size-4" />
        </IconButton>
      )}
      {canShare && hasGroupId && (
        <IconButton aria-label="귀속" onClick={onUnshare} disabled={unsharePending || readOnly} title={readOnly ? lockTitle : undefined} className={cn(readOnly && dimmed)}>
          <Undo2 className="size-4" />
        </IconButton>
      )}
      {onDuplicate && (
        <IconButton aria-label="복제" onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconButton>
      )}
      <IconButton aria-label="수정" onClick={onEdit} disabled={editDisabled} title={editDisabled ? lockTitle : undefined} className={cn(editDisabled && dimmed)}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton
        aria-label="삭제"
        onClick={onDelete}
        disabled={editDisabled}
        title={editDisabled ? lockTitle : undefined}
        className={cn('text-destructive hover:text-destructive', editDisabled && dimmed)}
      >
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  )
}
