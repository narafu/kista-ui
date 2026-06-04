export default function AdminLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-40 rounded bg-muted mb-6" />
      <div className="rounded-[var(--r-lg)] border border-border bg-card overflow-hidden">
        <div className="h-12 bg-muted/50 border-b border-border" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-14 border-b border-border last:border-0 px-4 flex items-center gap-4">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-4 w-20 rounded bg-muted" />
            <div className="h-4 w-24 rounded bg-muted ml-auto" />
          </div>
        ))}
      </div>
    </div>
  )
}
