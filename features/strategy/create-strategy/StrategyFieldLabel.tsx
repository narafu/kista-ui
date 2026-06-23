export function StrategyFieldLabel({
  children,
  hint,
}: {
  children: React.ReactNode
  hint?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between mb-2">
      <span className="text-sm font-bold text-foreground">
        {children}
      </span>
      {hint && (
        <span className="text-sm text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  )
}
