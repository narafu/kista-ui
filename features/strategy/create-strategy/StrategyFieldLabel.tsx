export function StrategyFieldLabel({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode
  hint?: React.ReactNode
  htmlFor?: string
}) {
  const Text = htmlFor ? 'label' : 'span'
  return (
    <div className="flex items-center justify-between mb-2">
      <Text htmlFor={htmlFor} className="text-sm font-bold text-foreground">
        {children}
      </Text>
      {hint && (
        <span className="text-sm text-muted-foreground">
          {hint}
        </span>
      )}
    </div>
  )
}
