interface Props {
  warnings: string[]
}

export function BacktestWarnings({ warnings }: Props) {
  if (warnings.length === 0) return null

  return (
    <div className="flex flex-col gap-2 rounded-[var(--r-sm)] border border-[var(--warn)] bg-[var(--warn-bg)] p-4">
      <p className="text-sm font-bold text-[var(--warn)]">해석 시 유의사항</p>
      <ul className="flex flex-col gap-1.5 text-sm text-[var(--warn)]">
        {warnings.map((warning, index) => (
          <li key={index}>· {warning}</li>
        ))}
      </ul>
    </div>
  )
}
