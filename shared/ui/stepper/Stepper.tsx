import { Check } from 'lucide-react'
import { cn } from '@shared/lib/utils'

interface StepperProps {
  steps: string[]
  current: number
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <div className="flex items-start gap-0">
      {steps.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  'size-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-colors',
                  done   && 'bg-rose-600 border-rose-600 text-white',
                  active && 'bg-white border-rose-600 text-rose-600 dark:bg-background',
                  !done && !active && 'bg-muted border-border text-muted-foreground',
                )}
              >
                {done ? <Check className="size-4" /> : idx}
              </div>
              <span
                className={cn(
                  'text-sm font-medium text-center leading-none whitespace-nowrap',
                  active ? 'text-rose-600' : done ? 'text-foreground' : 'text-muted-foreground',
                )}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-px flex-1 mx-2 -mt-4', done ? 'bg-rose-600' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}
