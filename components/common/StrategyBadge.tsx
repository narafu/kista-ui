import { cn } from '@/lib/utils'

type Strategy = 'INFINITE' | 'PRIVACY'

const CONFIG: Record<Strategy, { label: string; bg: string; text: string }> = {
  INFINITE: { label: '인피니트',  bg: 'bg-rose-50',  text: 'text-rose-600' },
  PRIVACY:  { label: '프라이버시', bg: 'bg-muted',   text: 'text-muted-foreground' },
}

export function StrategyBadge({ strategy, className }: { strategy: Strategy; className?: string }) {
  const cfg = CONFIG[strategy] ?? CONFIG.INFINITE
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 h-[22px] rounded-full text-[11px] font-semibold whitespace-nowrap',
        cfg.bg, cfg.text, className,
      )}
    >
      {cfg.label}
    </span>
  )
}
