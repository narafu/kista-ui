export default function AccountEditLoading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto space-y-4">
      <div className="h-8 w-32 rounded bg-muted mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 rounded-[var(--r-lg)] bg-card border border-border" />
      ))}
    </div>
  )
}
