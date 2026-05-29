import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineStep {
  label: string
  description?: string
  done?: boolean
}

interface TimelineProps {
  steps: TimelineStep[]
}

export function Timeline({ steps }: TimelineProps) {
  return (
    <div className="flex flex-col">
      {steps.map((step, i) => (
        <div key={step.label} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'size-7 rounded-full border-2 flex items-center justify-center shrink-0',
                step.done
                  ? 'bg-status-ok border-status-ok text-white'
                  : 'bg-background border-border text-muted-foreground',
              )}
            >
              {step.done ? (
                <Check className="size-3.5" />
              ) : (
                <span className="text-xs font-semibold">{i + 1}</span>
              )}
            </div>
            {i < steps.length - 1 && (
              <div className={cn('w-px flex-1 my-1', step.done ? 'bg-status-ok/30' : 'bg-border')} />
            )}
          </div>
          <div className="pb-6">
            <p
              className={cn(
                'text-sm font-semibold',
                step.done ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {step.label}
            </p>
            {step.description && (
              <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
