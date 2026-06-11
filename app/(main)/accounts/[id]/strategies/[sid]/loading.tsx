export default function StrategyDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="h-20 rounded-[var(--r-lg)] bg-card border border-border" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="h-24 rounded-[var(--r-lg)] bg-card border border-border" />
        <div className="h-24 rounded-[var(--r-lg)] bg-card border border-border" />
        <div className="h-24 rounded-[var(--r-lg)] bg-card border border-border" />
        <div className="h-24 rounded-[var(--r-lg)] bg-card border border-border" />
      </div>
      <div className="h-40 rounded-[var(--r-lg)] bg-card border border-border" />
      <div className="h-64 rounded-[var(--r-lg)] bg-card border border-border" />
      <div className="h-16 rounded-[var(--r-lg)] bg-card border border-border" />
    </div>
  )
}
