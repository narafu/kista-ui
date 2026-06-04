export default function AccountDetailLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 w-48 rounded bg-muted" />
      <div className="grid grid-cols-2 gap-6">
        <div className="h-48 rounded-[var(--r-lg)] bg-card border border-border" />
        <div className="h-48 rounded-[var(--r-lg)] bg-card border border-border" />
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 rounded-[var(--r-lg)] bg-card border border-border" />
        <div className="h-64 rounded-[var(--r-lg)] bg-card border border-border" />
      </div>
      <div className="h-40 rounded-[var(--r-lg)] bg-card border border-border" />
    </div>
  )
}
