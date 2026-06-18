export default function AdminSubLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-muted mb-6" />
      <div className="rounded-xl border border-border overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-border last:border-0 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-5 w-32 rounded bg-muted" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
            <div className="h-4 w-3/4 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  )
}
