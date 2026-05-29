export function StrategyFieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}
    >
      <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>
        {children}
      </span>
      {hint && (
        <span style={{ fontSize: 10.5, color: 'var(--muted-foreground)' }}>
          {hint}
        </span>
      )}
    </div>
  )
}
