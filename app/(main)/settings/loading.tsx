export default function SettingsLoading() {
  return (
    <div>
      <div className="flex items-end justify-between gap-4 mb-8">
        <div>
          <div className="h-3 w-12 rounded bg-muted animate-pulse mb-2" />
          <div className="h-8 w-28 rounded bg-muted animate-pulse" />
        </div>
      </div>
      <div className="flex flex-col gap-[18px]">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-40 rounded-[var(--r-lg)] bg-card border border-border animate-pulse" />
        ))}
      </div>
    </div>
  )
}
