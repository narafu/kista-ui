import { Badge } from '@shared/ui/Badge'
import { cn } from '@shared/lib/utils'
import type { FinanceCategory } from '@entities/finance'

interface Props {
  category: FinanceCategory
  depth: number
  onEdit: (category: FinanceCategory) => void
  onDelete: (category: FinanceCategory) => void
  /** true면 system 카테고리의 수정·삭제를 잠근다(그룹 스코프 기본값). 관리자 화면은 false로 넘겨 시스템 카테고리를 편집한다. */
  lockSystemCategories?: boolean
}

// 그룹 스코프에서는 system 카테고리를 kista-api가 PUT/DELETE 시 403을 낸다 — 수정·삭제 버튼을
// 여기서 비활성화한다. 서버는 depth 제한이 없지만 이 UI는 L1/L2 2단만 지원해 재귀 depth는
// 실질적으로 0·1만 쓰인다.
export function CategoryRow({ category, depth, onEdit, onDelete, lockSystemCategories = true }: Props) {
  const locked = lockSystemCategories && category.system
  return (
    <>
      <li className={cn('flex items-center justify-between gap-3 border-t border-border px-4 py-3 first:border-t-0', depth > 0 && 'pl-10')}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium">{category.name}</span>
          {category.system && <Badge tone="neutral" size="sm">시스템</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={() => onEdit(category)}
            disabled={locked}
            className={cn('text-xs font-semibold text-foreground hover:text-[var(--brand-fg-soft)]', locked && 'opacity-40 pointer-events-none')}
          >
            수정
          </button>
          <button
            type="button"
            onClick={() => onDelete(category)}
            disabled={locked}
            className={cn('text-xs font-semibold text-destructive hover:text-destructive/80', locked && 'opacity-40 pointer-events-none')}
          >
            삭제
          </button>
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
        />
      ))}
    </>
  )
}
