export const adminKeys = {
  all: ['admin'] as const,
  users: (filter?: string) => [...adminKeys.all, 'users', filter ?? 'ALL'] as const,
}
