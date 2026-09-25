import Link from 'next/link'
import { Copy, Pencil, Share2, Trash2, Undo2 } from 'lucide-react'
import { cn } from '@shared/lib/utils'
import { IconButton, ICON_LINK_GHOST_CLASS } from './IconButton'

// 미전달 시 복제 버튼 자체를 렌더하지 않는다(계좌 목록처럼 복제 개념이 없는 리소스).
// duplicateHref가 있으면 <Link>로(자산 기록처럼 라우트 이동), onDuplicate만 있으면 onClick으로 렌더한다 —
// 판정 기준이 "값이 있는 쪽"이라 실수로 둘 다 넘기면 조용히 duplicateHref가 이기므로 타입으로 막는다.
type DuplicateAction =
  | { onDuplicate?: () => void; duplicateHref?: never }
  | { onDuplicate?: never; duplicateHref: string }

// onEdit(onClick) 또는 editHref(<Link>, 자산 기록처럼 라우트 이동) 중 정확히 하나를 전달한다 —
// 유니온으로 강제해 둘 다 비운 채 호출해 수정 버튼이 아무 동작도 하지 않는 실수를 컴파일 타임에 막는다.
type EditAction =
  | { onEdit: () => void; editHref?: never }
  | { onEdit?: never; editHref: string }

type Props = {
  canShare: boolean
  hasGroupId: boolean
  onShare: () => void
  onUnshare: () => void
  sharePending: boolean
  unsharePending: boolean
  onDelete: () => void
  // true면 수정·삭제를 비활성화한다(시스템 카테고리처럼 서버가 403을 내는 대상, 마감된 달처럼
  // 레코드 변경을 전면 차단하는 대상 등). 복제는 사용자가 폼에서 새 날짜를 고르는 신규 생성이라
  // 이 잠금과 무관해 영향받지 않는다.
  locked?: boolean
  // true면 공유·귀속도 함께 비활성화한다(마감된 달처럼 레코드 자체가 잠긴 대상 — locked와 함께 켠다).
  // 시스템 카테고리처럼 수정·삭제만 막고 공유는 그대로 둬야 하는 대상은 locked만 켠다.
  lockShare?: boolean
  // locked/lockShare로 비활성화된 버튼에 붙는 tooltip.
  lockTitle?: string
} & DuplicateAction & EditAction

/**
 * 공유/귀속(조건부) → 복제(선택) → 수정 → 삭제 순서의 공용 행 작업 버튼 세트.
 * 거래내역·예산·계좌·카테고리·자산 기록 목록이 동일한 조합을 재사용한다. 자산 기록처럼 복제/수정이
 * 다이얼로그가 아니라 라우트 이동인 경우 duplicateHref/editHref(<Link>)를 쓴다 — 시각은
 * IconButton과 동일한 ICON_LINK_GHOST_CLASS를 공유해 onClick 버전과 구분되지 않는다.
 */
export function ShareableRowActions({
  canShare, hasGroupId, onShare, onUnshare, sharePending, unsharePending,
  onDuplicate, duplicateHref, onEdit, editHref, onDelete,
  locked = false, lockShare = false, lockTitle,
}: Props) {
  const editDisabled = locked
  const shareDisabled = lockShare
  // disabled 버튼이라 클릭은 이미 막힌다 — opacity만 낮추고 pointer-events는 남겨 hover 시 title(tooltip)이 뜨게 한다.
  const dimmed = 'opacity-40'
  return (
    <div className="flex shrink-0 items-center gap-1">
      {canShare && !hasGroupId && (
        <IconButton aria-label="공유" onClick={onShare} disabled={sharePending || shareDisabled} title={shareDisabled ? lockTitle : undefined} className={cn(shareDisabled && dimmed)}>
          <Share2 className="size-4" />
        </IconButton>
      )}
      {canShare && hasGroupId && (
        <IconButton aria-label="귀속" onClick={onUnshare} disabled={unsharePending || shareDisabled} title={shareDisabled ? lockTitle : undefined} className={cn(shareDisabled && dimmed)}>
          <Undo2 className="size-4" />
        </IconButton>
      )}
      {duplicateHref ? (
        <Link href={duplicateHref} aria-label="복제" title="복제" className={ICON_LINK_GHOST_CLASS}>
          <Copy className="size-4" />
        </Link>
      ) : onDuplicate && (
        <IconButton aria-label="복제" onClick={onDuplicate}>
          <Copy className="size-4" />
        </IconButton>
      )}
      {editHref ? (
        editDisabled ? (
          <IconButton aria-label="수정" disabled title={lockTitle} className={dimmed}>
            <Pencil className="size-4" />
          </IconButton>
        ) : (
          <Link href={editHref} aria-label="수정" title="수정" className={ICON_LINK_GHOST_CLASS}>
            <Pencil className="size-4" />
          </Link>
        )
      ) : (
        <IconButton aria-label="수정" onClick={onEdit} disabled={editDisabled} title={editDisabled ? lockTitle : undefined} className={cn(editDisabled && dimmed)}>
          <Pencil className="size-4" />
        </IconButton>
      )}
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
