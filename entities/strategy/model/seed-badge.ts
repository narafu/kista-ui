const CYCLE_SEED_BADGE_CLS: Record<string, string> = {
  NONE:     'bg-muted text-muted-foreground',
  MAX:      'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400',
  MAINTAIN: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
}

export function seedBadgeClass(cycleSeedType: string): string {
  return CYCLE_SEED_BADGE_CLS[cycleSeedType] ?? 'bg-muted text-muted-foreground'
}
