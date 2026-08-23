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
}

/**
 * 공유/귀속(조건부) → 복제(선택) → 수정 → 삭제 순서의 공용 행 작업 버튼 세트.
 * 거래내역·예산·계좌·카테고리 목록이 동일한 조합을 재사용한다 — Link 기반 복제/수정(자산 기록)은
 * 라우팅 방식이 달라 이 컴포넌트를 쓰지 않고 각자 구현을 유지한다.
 */
export function ShareableRowActions({
  canShare, hasGroupId, onShare, onUnshare, sharePending, unsharePending, onDuplicate, onEdit, onDelete, locked = false,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canShare && !hasGroupId && (
        <IconButton aria-label="공유" onClick={onShare} disabled={sharePending}>
          <Share2 className="size-4" />
        </IconButton>
      )}
      {canShare && hasGroupId && (
        <IconButton aria-label="귀속" onClick={onUnshare} disabled={unsharePending}>
          <Undo2 className="size-4" />
        </IconButton>
      )}
      {onDuplicate && (
        <IconButton aria-label="복제" onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconButton>
      )}
      <IconButton aria-label="수정" onClick={onEdit} disabled={locked} className={cn(locked && 'opacity-40 pointer-events-none')}>
        <Pencil className="size-4" />
      </IconButton>
      <IconButton
        aria-label="삭제"
        onClick={onDelete}
        disabled={locked}
        className={cn('text-destructive hover:text-destructive', locked && 'opacity-40 pointer-events-none')}
      >
        <Trash2 className="size-4" />
      </IconButton>
    </div>
  )
}
