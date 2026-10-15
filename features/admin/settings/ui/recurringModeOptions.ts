import { VR_RECURRING_MODE_LABEL, type VrRecurringMode } from '@entities/strategy'

const RECURRING_MODES = ['DEPOSIT', 'HOLD', 'WITHDRAW'] as const satisfies readonly VrRecurringMode[]

export const RECURRING_MODE_OPTIONS = RECURRING_MODES.map((value) => ({ value, label: VR_RECURRING_MODE_LABEL[value] }))
