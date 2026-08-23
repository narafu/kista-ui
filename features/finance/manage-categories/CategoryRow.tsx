import { Pencil, Share2, Trash2, Undo2 } from 'lucide-react'
import { Badge } from '@shared/ui/Badge'
import { IconButton } from '@shared/ui/IconButton'
import { cn } from '@shared/lib/utils'
import type { FinanceCategory } from '@entities/finance'

interface Props {
  category: FinanceCategory
  depth: number
  onEdit: (category: FinanceCategory) => void
  onDelete: (category: FinanceCategory) => void
  /** true면 system 카테고리의 수정·삭제를 잠근다(그룹 스코프 기본값). 관리자 화면은 false로 넘겨 시스템 카테고리를 편집한다. */
  lockSystemCategories?: boolean
  /** 공유/귀속 버튼 게이팅(그룹 소속 여부) — 미전달 시 버튼 자체를 렌더하지 않는다(관리자 시스템 카테고리 화면). */
  canShare?: boolean
  onShare?: (category: FinanceCategory) => void
  onUnshare?: (category: FinanceCategory) => void
  shareMutationPending?: boolean
  unshareMutationPending?: boolean
}

// 그룹 스코프에서는 system 카테고리를 kista-api가 PUT/DELETE 시 403을 낸다 — 수정·삭제 버튼을
// 여기서 비활성화한다. 서버는 depth 제한이 없지만 이 UI는 L1/L2 2단만 지원해 재귀 depth는
// 실질적으로 0·1만 쓰인다.
export function CategoryRow({
  category,
  depth,
  onEdit,
  onDelete,
  lockSystemCategories = true,
  canShare = false,
  onShare,
  onUnshare,
  shareMutationPending = false,
  unshareMutationPending = false,
}: Props) {
  const locked = lockSystemCategories && category.system
  // 공유/귀속은 예산/거래내역과 동일하게 하위(관리자 화면 진입 등)엔 노출하지 않는다 — system 카테고리는
  // 그룹 개념이 없다(userId도 groupId도 항상 null).
  const showShare = canShare && !category.system
  return (
    <>
      <li className={cn('flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0', depth > 0 && 'pl-10')}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          {category.system && <Badge tone="neutral" size="sm">시스템</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {showShare && !category.groupId && (
            <IconButton aria-label="공유" onClick={() => onShare?.(category)} disabled={shareMutationPending}>
              <Share2 className="size-4" />
            </IconButton>
          )}
          {showShare && category.groupId && (
            <IconButton aria-label="귀속" onClick={() => onUnshare?.(category)} disabled={unshareMutationPending}>
              <Undo2 className="size-4" />
            </IconButton>
          )}
          <IconButton
            aria-label="수정"
            onClick={() => onEdit(category)}
            disabled={locked}
            className={cn(locked && 'opacity-40 pointer-events-none')}
          >
            <Pencil className="size-4" />
          </IconButton>
          <IconButton
            aria-label="삭제"
            onClick={() => onDelete(category)}
            disabled={locked}
            className={cn('text-destructive hover:text-destructive', locked && 'opacity-40 pointer-events-none')}
          >
            <Trash2 className="size-4" />
          </IconButton>
        </div>
      </li>
      {category.children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          onEdit={onEdit}
          onDelete={onDelete}
          lockSystemCategories={lockSystemCategories}
          canShare={canShare}
          onShare={onShare}
          onUnshare={onUnshare}
          shareMutationPending={shareMutationPending}
          unshareMutationPending={unshareMutationPending}
        />
      ))}
    </>
  )
}
