import { Skeleton } from '@/components/ui/skeleton'
import { CardSkeleton } from '@shared/ui/CardSkeleton'
import { RouteModal } from '@shared/ui/RouteModal'

/** 인터셉팅 라우트 폼 모달 loading.tsx 공용 스켈레톤 — 카드 4개. */
export function ModalFormSkeleton() {
  return (
    <RouteModal>
      <div className="animate-pulse space-y-4">
        <Skeleton className="h-8 w-32 mb-6" />
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-16" />
        ))}
      </div>
    </RouteModal>
  )
}
