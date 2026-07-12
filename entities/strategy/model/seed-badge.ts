const CYCLE_SEED_BADGE_CLS: Record<string, string> = {
  NONE:     'bg-muted text-muted-foreground',
  MAX:      'bg-info-bg text-info',
  MAINTAIN: 'bg-status-ok-bg text-status-ok',
}

export function seedBadgeClass(cycleSeedType: string): string {
  return CYCLE_SEED_BADGE_CLS[cycleSeedType] ?? 'bg-muted text-muted-foreground'
}
