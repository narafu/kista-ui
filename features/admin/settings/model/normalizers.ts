export function normalizeSymbol(value: string) {
  return value.trim().toUpperCase()
}

export function normalizeText(value: string) {
  return value.trim()
}

export function normalizeNumber(value: string) {
  const trimmed = value.trim()
  if (trimmed === '') return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}
