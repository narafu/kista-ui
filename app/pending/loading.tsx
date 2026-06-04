export default function PendingLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <div className="h-10 w-48 rounded bg-muted mx-auto" />
        <div className="h-4 w-64 rounded bg-muted mx-auto" />
        <div className="h-12 w-full rounded-[var(--r-lg)] bg-muted mt-6" />
      </div>
    </div>
  )
}
