export default function RejectedLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse space-y-4">
        <div className="h-10 w-48 rounded bg-muted mx-auto" />
        <div className="h-20 w-full rounded-[var(--r-lg)] bg-muted" />
        <div className="h-12 w-full rounded-[var(--r-lg)] bg-muted" />
      </div>
    </div>
  )
}
