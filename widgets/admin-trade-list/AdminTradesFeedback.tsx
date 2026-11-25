interface Props {
  actionError: string | null
}

export function AdminTradesFeedback({ actionError }: Props) {
  return actionError ? (
    <section
      role="alert"
      className="rounded-xl border border-status-error-border bg-status-error-bg p-4 text-status-error"
      aria-label="조회 오류"
    >
      <p className="text-sm font-medium">{actionError}</p>
    </section>
  ) : null
}
