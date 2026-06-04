export default function AccountNewLoading() {
  return (
    <div className="animate-pulse max-w-2xl mx-auto space-y-4">
      <div className="h-8 w-32 rounded bg-muted mb-6" />
      <div className="h-2 w-full rounded-full bg-muted mb-8" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-16 rounded-[var(--r-lg)] bg-card border border-border" />
      ))}
    </div>
  )
}
