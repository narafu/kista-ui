import { CardSkeleton } from '@shared/ui/CardSkeleton'

export default function StatsLoading() {
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} className="h-20" />
        ))}
      </div>
      <CardSkeleton className="h-72 mb-4" />
      <CardSkeleton className="h-48" />
    </div>
  )
}
