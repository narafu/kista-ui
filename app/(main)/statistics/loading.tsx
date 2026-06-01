export default function StatisticsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-3 w-16 rounded bg-muted animate-pulse mb-2" />
          <div className="h-8 w-24 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-[var(--r-lg)] bg-card border border-border animate-pulse" />
        ))}
      </div>
      <div className="h-64 rounded-[var(--r-lg)] bg-card border border-border animate-pulse" />
    </div>
  )
}
