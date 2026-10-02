import type { RecurringMode } from '@entities/runtime-config'

export const RECURRING_MODE_OPTIONS = [
  { value: 'DEPOSIT', label: '입금' },
  { value: 'HOLD', label: '거치' },
  { value: 'WITHDRAW', label: '인출' },
] as const satisfies readonly { value: RecurringMode; label: string }[]
