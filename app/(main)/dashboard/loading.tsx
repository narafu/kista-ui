export default function DashboardLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-3 w-20 rounded bg-muted animate-pulse mb-2" />
          <div className="h-8 w-32 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-[var(--r-lg)] bg-card border border-border animate-pulse" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[var(--r-lg)] bg-card border border-border animate-pulse" />
        ))}
      </div>
    </div>
  )
}
